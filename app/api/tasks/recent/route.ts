import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authoptions';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const recentTodoLists = await prisma.todoList.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId: userId,
                status: 'ACCEPTED',
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 3,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json(recentTodoLists);

  } catch (error) {
    console.error("Failed to fetch recent to-do lists:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}