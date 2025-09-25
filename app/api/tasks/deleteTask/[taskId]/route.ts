import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.todoList.findUnique({
      where: { id: taskId },
      select: {
        ownerId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (task.ownerId !== session.user.id) {
      return NextResponse.json(
        {
          message: "Forbidden: You do not have permission to delete this task",
        },
        { status: 403 }
      );
    }

    await prisma.todoList.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      {
        message: "An error occurred while deleting the task.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
