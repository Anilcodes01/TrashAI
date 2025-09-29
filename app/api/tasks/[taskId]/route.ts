import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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
          select: {
            id: true,
            content: true,
            completed: true,
            order: true,
            createdAt: true,
            updatedAt: true,
            subTasks: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                content: true,
                completed: true,
                order: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                  select: { comments: true },
                },
              },
            },
            _count: {
              select: { comments: true },
            },
          },
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




export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listId =(await params).taskId;
    const { title } = await request.json();

    const list = await prisma.todoList.findFirst({
      where: {
        id: listId,
        ownerId: session.user.id,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found or you do not have permission" }, { status: 404 });
    }
    
    // Validate input
    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    const updatedList = await prisma.todoList.update({
      where: { id: listId },
      data: { title: title.trim() },
    });

    return NextResponse.json(updatedList);

  } catch (error) {
    console.error("Failed to update list title:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}