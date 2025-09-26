// app/api/ai/command/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { pusher } from "@/app/lib/pusher";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

const createTask = {
  name: "createTask",
  description: "Creates a new top-level task in the to-do list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: "The content of the task to create. e.g., 'Buy milk'",
      },
    },
    required: ["content"],
  },
};

const createSubTask = {
  name: "createSubTask",
  description: "Creates a new sub-task underneath an existing parent task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      parentTaskId: {
        type: Type.STRING,
        description:
          "The ID of the parent task under which to create the new sub-task.",
      },
      subTaskContent: {
        type: Type.STRING,
        description: "The content of the sub-task to create.",
      },
    },
    required: ["parentTaskId", "subTaskContent"],
  },
};

const completeTask = {
  name: "completeTask",
  description:
    "Marks an existing task or sub-task as completed. Use this to 'check off', 'finish', or 'complete' an item.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: {
        type: Type.STRING,
        description: "The ID of the task or sub-task to mark as complete.",
      },
      itemType: {
        type: Type.STRING,
        enum: ["task", "subtask"],
        description:
          "Specifies whether the item to complete is a 'task' or a 'subtask'.",
      },
    },
    required: ["itemId", "itemType"],
  },
};

const commandSchema = z.object({
  prompt: z.string().min(1),
  listId: z.string().min(1),
  context: z.array(z.any()), 
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = commandSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: validation.error.issues },
      { status: 400 }
    );
  }

  const { prompt, listId, context } = validation.data;
  const socketId = req.headers.get("x-socket-id");

  try {
    const modelName = "gemini-2.5-flash";

    const fullPrompt = `
      User Request: "${prompt}"
      
      Current Task List Context (use the IDs from here):
      ${JSON.stringify(context, null, 2)}
    `;

    const contents = [{ role: "user" as const, parts: [{ text: fullPrompt }] }];

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        tools: [
          { functionDeclarations: [createSubTask, createTask, completeTask] },
        ],
      },
    });

    console.log("Result: ", result)
    const call = result.functionCalls && result.functionCalls[0];

    if (!call) {
      return NextResponse.json(
        { message: "AI could not determine an action." },
        { status: 400 }
      );
    }

    const { name, args }: any = call;

    switch (name) {
      case "createTask": {
        const lastTask = await prisma.task.findFirst({
          where: { todoListId: listId },
          orderBy: { order: "desc" },
        });
        const newOrder = (lastTask?.order ?? -1) + 1;
        const newTask = await prisma.task.create({
          data: { content: args.content, order: newOrder, todoListId: listId },
        });
        await pusher.trigger(
          `private-list-${listId}`,
          "item-added",
          { item: newTask, itemType: "task" },
          { socket_id: socketId ?? undefined }
        );
        break;
      }
      case "createSubTask": {
        const lastSubTask = await prisma.subTask.findFirst({
          where: { taskId: args.parentTaskId },
          orderBy: { order: "desc" },
        });
        const newOrder = (lastSubTask?.order ?? -1) + 1;
        const newSubTask = await prisma.subTask.create({
          data: {
            content: args.subTaskContent,
            order: newOrder,
            taskId: args.parentTaskId,
          },
        });
        await pusher.trigger(
          `private-list-${listId}`,
          "item-added",
          {
            item: newSubTask,
            itemType: "subtask",
            parentId: args.parentTaskId,
          },
          { socket_id: socketId ?? undefined }
        );
        break;
      }
      case "completeTask": {
        if (args.itemType === "task") {
          await prisma.task.update({
            where: { id: args.itemId },
            data: { completed: true },
          });
        } else {
          await prisma.subTask.update({
            where: { id: args.itemId },
            data: { completed: true },
          });
        }
        await pusher.trigger(
          `private-list-${listId}`,
          "item-updated",
          { itemId: args.itemId, itemType: args.itemType, completed: true },
          { socket_id: socketId ?? undefined }
        );
        break;
      }

      case "deleteTask": {
        if (args.itemType === "task") {
          await prisma.task.delete({ where: { id: args.itemId } });
        } else {
          const subtask = await prisma.subTask.findUnique({
            where: { id: args.itemId },
            select: { taskId: true },
          });
          await prisma.subTask.delete({ where: { id: args.itemId } });
          await pusher.trigger(
            `private-list-${listId}`,
            "item-deleted",
            {
              itemId: args.itemId,
              itemType: args.itemType,
              parentId: subtask?.taskId,
            },
            { socket_id: socketId ?? undefined }
          );
          break;
        }
        await pusher.trigger(
          `private-list-${listId}`,
          "item-deleted",
          { itemId: args.itemId, itemType: args.itemType },
          { socket_id: socketId ?? undefined }
        );
        break;
      }
      case "updateTaskContent": {
        if (args.itemType === "task") {
          await prisma.task.update({
            where: { id: args.itemId },
            data: { content: args.newContent },
          });
        } else {
          await prisma.subTask.update({
            where: { id: args.itemId },
            data: { content: args.newContent },
          });
        }
        await pusher.trigger(
          `private-list-${listId}`,
          "item-updated",
          {
            itemId: args.itemId,
            itemType: args.itemType,
            content: args.newContent,
          },
          { socket_id: socketId ?? undefined }
        );
        break;
      }
      case "moveTask": {
        if (args.itemType === "task") {
          await prisma.task.update({
            where: { id: args.itemId },
            data: { order: args.newOrder },
          });
        } else {
          await prisma.subTask.update({
            where: { id: args.itemId },
            data: { order: args.newOrder },
          });
        }
        await pusher.trigger(
          `private-list-${listId}`,
          "list-reordered",
          {},
          { socket_id: socketId ?? undefined }
        );
        break;
      }
      default:
        return NextResponse.json(
          { message: `Unknown function call: ${name}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, action: name });
  } catch (error) {
    console.error("AI command failed:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
