'use server';

import {prisma} from '@/app/lib/prisma'
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authOptions } from '../lib/authoptions';

export async function getPendingInvitationCount() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return 0;
  }

  const count = await prisma.todoListCollaborator.count({
    where: {
      userId: session.user.id,
      status: 'PENDING',
    },
  });

  return count;
}

export async function getInvitations() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const invitations = await prisma.todoListCollaborator.findMany({
    where: {
      userId: session.user.id,
      status: 'PENDING',
    },
    include: {
      todoList: {
        select: {
          id: true,
          title: true,
          owner: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return invitations;
}

export async function acceptInvitation(collaborationId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const invitation = await prisma.todoListCollaborator.findFirst({
      where: { id: collaborationId, userId: session.user.id }
  });

  if (!invitation) {
      throw new Error("Invitation not found or you don't have permission.");
  }

  await prisma.todoListCollaborator.update({
    where: {
      id: collaborationId,
    },
    data: {
      status: 'ACCEPTED',
    },
  });

  revalidatePath('/inbox');
  redirect(`/tasks/${invitation.todoListId}`);
}

export async function declineInvitation(collaborationId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const { count } = await prisma.todoListCollaborator.deleteMany({
    where: {
      id: collaborationId,
      userId: session.user.id, 
    },
  });
  
  if (count === 0) {
      throw new Error("Invitation not found or you don't have permission.");
  }

  revalidatePath('/inbox');
}