import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { pusher } from "@/app/lib/pusher";

export async function PATCH(
  request: NextRequest,
  { params }: { params: any } // 👈 simplest way
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const { taskId, itemType, itemId } = params;
  const { completed } = await request.json();

  if (typeof completed !== "boolean" || !taskId || !itemType || !itemId) {
    return NextResponse.json(
      { error: "Invalid request body or params" },
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
        { error: "List not found or you do not have permission" },
        { status: 403 }
      );
    }

    let updatedItem;
    if (itemType === "task") {
      updatedItem = await prisma.task.update({
        where: { id: itemId, todoListId: taskId },
        data: { completed },
      });
    } else if (itemType === "subtask") {
      updatedItem = await prisma.subTask.update({
        where: { id: itemId, task: { todoListId: taskId } },
        data: { completed },
      });
    } else {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    if (updatedItem) {
      await pusher.trigger(
        `private-list-${taskId}`,
        "item-updated",
        {
          itemId,
          itemType,
          completed,
        },
        { socket_id: socketId || undefined }
      );
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Failed to update item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}
