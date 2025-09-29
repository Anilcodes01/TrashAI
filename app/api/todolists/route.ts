import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authoptions';
import { prisma } from '@/app/lib/prisma';

// POST handler for creating a new TodoList
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Create a new TodoList with a placeholder title
    const newTodoList = await prisma.todoList.create({
      data: {
        title: 'Untitled List', // This is our placeholder
        description: '',
        ownerId: userId,
      },
    });

    // Respond with the newly created list object
    return NextResponse.json(newTodoList, { status: 201 });

  } catch (error) {
    console.error("Failed to create new to-do list:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}