import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } } 
) {
  console.log(`--- API route /api/tasks/[taskId] hit for ID: ${params.taskId} ---`);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("🚫 API Error: No valid session found. User is unauthorized.");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { taskId } = params; 
    
    console.log(`👤 Authenticated User ID: ${userId}`);
    console.log(`🔍 Searching for TodoList with ID: ${taskId}`);

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
      console.log("❌ API Error: TodoList not found in database for this user.");
      return NextResponse.json({ message: "Todo list not found" }, { status: 404 });
    }
    
    console.log("✅ API Success: Found TodoList. Sending data.");
    return NextResponse.json(todoList, { status: 200 });

  } catch (error: any) {
    console.error("🔥 API Catastrophic Error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred", error: error.message },
      { status: 500 }
    );
  }
}