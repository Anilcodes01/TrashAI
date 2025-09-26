import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { pusher } from "@/app/lib/pusher";
import { z } from "zod";

const appendTaskSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  type: z.enum(["task", "subtask"]),
  parentId: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } =await params;
  const socketId = req.headers.get("x-socket-id");

  const list = await prisma.todoList.findUnique({
    where: { id: taskId },
    include: {
      collaborators: {
        where: { status: "ACCEPTED" },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ message: "List not found" }, { status: 404 });
  }

  const isOwner = list.ownerId === session.user.id;
  const isCollaborator = list.collaborators.some(
    (c) => c.userId === session.user.id
  );

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const validation = appendTaskSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: validation.error.issues },
      { status: 400 }
    );
  }

  const { content, type, parentId } = validation.data;

  if (type === "subtask" && !parentId) {
    return NextResponse.json(
      { message: "parentId is required for subtasks" },
      { status: 400 }
    );
  }

  try {
    let newItem;

    if (type === "task") {
      const lastTask = await prisma.task.findFirst({
        where: { todoListId: taskId },
        orderBy: { order: "desc" },
      });
      const newOrder = (lastTask?.order ?? -1) + 1;

      newItem = await prisma.task.create({
        data: {
          content,
          order: newOrder,
          todoListId: taskId,
        },
      });
    } else {
      const lastSubTask = await prisma.subTask.findFirst({
        where: { taskId: parentId! },
        orderBy: { order: "desc" },
      });
      const newOrder = (lastSubTask?.order ?? -1) + 1;

      newItem = await prisma.subTask.create({
        data: {
          content,
          order: newOrder,
          taskId: parentId!,
        },
      });
    }

    const channelName = `private-list-${taskId}`;
    const eventName = "item-added";
    const payload = {
      item: newItem,
      itemType: type,
      parentId: type === "subtask" ? parentId : undefined,
    };

    if (socketId) {
      await pusher.trigger(channelName, eventName, payload, {
        socket_id: socketId,
      });
    } else {
      await pusher.trigger(channelName, eventName, payload);
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Failed to append item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
