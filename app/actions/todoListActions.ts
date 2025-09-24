'use server';

import {prisma} from '@/app/lib/prisma'
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '../lib/authoptions';

export async function inviteUserToList(todoListId: string, inviteeUserId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const list = await prisma.todoList.findUnique({
    where: { id: todoListId, ownerId: session.user.id },
  });

  if (!list) {
    throw new Error('List not found or you do not have permission to invite users.');
  }

  const invitee = await prisma.user.findUnique({
    where: { id: inviteeUserId },
  });

  if (!invitee) {
    throw new Error('User to invite not found.');
  }
  
  if (invitee.id === session.user.id) {
      throw new Error("You cannot invite yourself.");
  }

  const existingCollaborator = await prisma.todoListCollaborator.findFirst({
    where: { todoListId: todoListId, userId: inviteeUserId },
  });

  if (existingCollaborator) {
    throw new Error('This user is already a collaborator.');
  }

  await prisma.todoListCollaborator.create({
    data: {
      todoListId: todoListId,
      userId: inviteeUserId,
    },
  });

  revalidatePath(`/tasks/${todoListId}`);

  return { success: true, message: `${invitee.name || invitee.username} has been invited!` };
}