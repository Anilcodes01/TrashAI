import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { taskId } = await params;

    const todoList = await prisma.todoList.findFirst({
      where: {
        id: taskId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId: userId, status: "ACCEPTED" } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, username: true },
        },
        collaborators: {
          where: { status: "ACCEPTED" },
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
        tasks: {
          orderBy: { order: "asc" },
          include: { subTasks: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!todoList) {
      return NextResponse.json(
        { message: "Todo list not found or you don't have access" },
        { status: 404 }
      );
    }

    return NextResponse.json(todoList, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "An internal server error occurred", error: errorMessage },
      { status: 500 }
    );
  }
}
