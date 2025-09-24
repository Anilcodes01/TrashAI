import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";

// Define a type for the context parameter, which includes params
type RouteContext = {
  params: {
    taskId: string;
  };
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // Get taskId from the context object's params property
    const { taskId } = context.params;

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
    console.error("Error fetching task:", error); // It's a good practice to log the actual error on the server
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "An internal server error occurred", error: errorMessage },
      { status: 500 }
    );
  }
}