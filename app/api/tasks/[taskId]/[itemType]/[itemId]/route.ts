import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authoptions';
import {prisma} from '@/app/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string; itemType: 'task' | 'subtask'; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  const { taskId, itemType, itemId } =await params;
  const { completed } = await request.json();

  if (typeof completed !== 'boolean' || !taskId || !itemType || !itemId) {
    return NextResponse.json({ error: 'Invalid request body or params' }, { status: 400 });
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

    if (itemType === 'task') {
      const updatedTask = await prisma.task.update({
        where: {
          id: itemId,
          todoListId: taskId,
        },
        data: {
          completed: completed,
        },
      });
      return NextResponse.json(updatedTask);
    } else if (itemType === 'subtask') {
        const updatedSubtask = await prisma.subTask.update({
            where: {
                id: itemId,
                task: {
                    todoListId: taskId
                }
            },
            data: {
                completed: completed
            }
        });
        return NextResponse.json(updatedSubtask);
    } else {
        return NextResponse.json({ error: 'Invalid item type' }, { status: 400 });
    }

  } catch (error) {
    console.error("Failed to update item:", error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}