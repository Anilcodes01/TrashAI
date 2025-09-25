// Import NextRequest instead of the standard Request for more features
import { NextRequest, NextResponse } from 'next/server'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authoptions';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(
  // Use NextRequest for better type safety and Next.js specific helpers
  request: NextRequest, 
  // 1. The 'params' object is NOT a promise.
  // 2. The type for 'itemType' should be 'string' to match what Next.js provides.
  { params }: { params: { taskId: string; itemType: string; itemId: string } } 
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  // 3. No 'await' needed here since params is not a promise
  const { taskId, itemType, itemId } = params; 
  const { completed } = await request.json();

  if (typeof completed !== 'boolean' || !taskId || !itemType || !itemId) {
    return NextResponse.json({ error: 'Invalid request body or params' }, { status: 400 });
  }

  // 4. Add explicit validation for itemType
  if (itemType !== 'task' && itemType !== 'subtask') {
    return NextResponse.json({ error: 'Invalid item type' }, { status: 400 });
  }

  try {
    const list = await prisma.todoList.findFirst({
      where: {
        id: taskId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId: userId, status: 'ACCEPTED' } } },
        ],
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'List not found or you do not have permission' }, { status: 403 });
    }
    
    // Now TypeScript knows that itemType can only be 'task' or 'subtask'
    if (itemType === 'task') {
      const updatedTask = await prisma.task.update({
        where: {
          id: itemId,
          todoListId: taskId, // Ensure the task belongs to the list
        },
        data: {
          completed: completed,
        },
      });
      return NextResponse.json(updatedTask);
    } 
    // No need for 'else if' since we validated above. Can just be 'else'
    else { 
      // The original query for subtask was a bit complex.
      // A more direct way is to ensure the subtask exists and its parent task belongs to the list.
      const updatedSubtask = await prisma.subTask.update({
        where: {
          id: itemId,
          task: {
            todoListId: taskId, // This check is crucial for security
          },
        },
        data: {
          completed: completed,
        },
      });
      return NextResponse.json(updatedSubtask);
    }

  } catch (error) {
    // Check for Prisma's specific "record not found" error for better feedback
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
       return NextResponse.json({ error: 'Item not found in the specified list' }, { status: 404 });
    }
    console.error("Failed to update item:", error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}