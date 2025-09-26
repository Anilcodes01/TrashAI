import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { pusher } from "@/app/lib/pusher";

type RawParams = {
  taskId: string;
  itemType: string;
  itemId: string;
};

type Params = {
  taskId: string;
  itemType: "task" | "subtask";
  itemId: string;
};


export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<RawParams>;
  }
) {
  const { taskId, itemType, itemId } =await params;

  if (itemType !== "task" && itemType !== "subtask") {
    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { completed, content } = body;

  if (typeof completed !== "boolean" && typeof content !== "string") {
    return NextResponse.json(
      { error: "Invalid input: 'completed' must be a boolean or 'content' must be a string." },
      { status: 400 }
    );
  }

  const socketId = request.headers.get("x-socket-id");

  try {
    const list = await prisma.todoList.findFirst({
      where: {
        id: taskId,
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
    });
    if (!list) {
      return NextResponse.json(
        { error: "List not found or no permission" },
        { status: 403 }
      );
    }

    const dataToUpdate: { completed?: boolean; content?: string } = {};
    if (typeof completed === "boolean") {
      dataToUpdate.completed = completed;
    }
    if (typeof content === "string") {
      if (content.trim().length === 0) {
        return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
      }
      dataToUpdate.content = content.trim();
    }

    let updatedItem;
    if (itemType === "task") {
      updatedItem = await prisma.task.update({
        where: { id: itemId, todoListId: taskId },
        data: dataToUpdate,
      });
    } else {
      updatedItem = await prisma.subTask.update({
        where: { id: itemId, task: { todoListId: taskId } },
        data: dataToUpdate,
      });
    }

    const channelName = `private-list-${taskId}`;
    const pusherOptions = { socket_id: socketId || undefined };

    if (updatedItem) {
      if (dataToUpdate.completed !== undefined) {
        await pusher.trigger(
          channelName,
          "item-updated",
          { itemId, itemType, completed: dataToUpdate.completed },
          pusherOptions
        );
      }
      if (dataToUpdate.content !== undefined) {
        await pusher.trigger(
          channelName,
          "item-content-updated",
          { itemId, itemType, content: dataToUpdate.content },
          pusherOptions
        );
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Failed to update:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string; itemType: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId, itemType, itemId } =await params;
  const socketId = req.headers.get("x-socket-id");

  const list = await prisma.todoList.findUnique({
    where: { id: taskId },
    include: {
      collaborators: { where: { status: "ACCEPTED" } },
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

  try {
    if (itemType === "task") {
      await prisma.task.delete({
        where: { id: itemId },
      });
    } else if (itemType === "subtask") {
      await prisma.subTask.delete({
        where: { id: itemId },
      });
    } else {
      return NextResponse.json({ message: "Invalid item type" }, { status: 400 });
    }

    const channelName = `private-list-${taskId}`;
    const eventName = "item-deleted";
    const payload = { itemId, itemType };

    if (socketId) {
      await pusher.trigger(channelName, eventName, payload, { socket_id: socketId });
    } else {
      await pusher.trigger(channelName, eventName, payload);
    }

    return new NextResponse(null, { status: 204 }); 
  } catch (error) {
    console.error("Failed to delete item:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}