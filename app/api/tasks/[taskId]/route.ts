import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { taskId } = params; 
    

    const todoList = await prisma.todoList.findUnique({
      where: {
        id: taskId,
        userId: userId,
      },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: { subTasks: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!todoList) {
      return NextResponse.json({ message: "Todo list not found" }, { status: 404 });
    }
    
    return NextResponse.json(todoList, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { message: "An internal server error occurred", error: error.message },
      { status: 500 }
    );
  }
}