'use server';

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '../lib/authoptions';
import { pusher } from '../lib/pusher'; // <-- 1. Import the pusher server instance

export async function inviteUserToList(todoListId: string, inviteeUserId: string) {
  const session = await getServerSession(authOptions);
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

  // --- 2. Add the Pusher Event Trigger ---
  try {
    const channelName = `private-user-${inviteeUserId}`;
    await pusher.trigger(channelName, 'new-invitation', {
      listTitle: list.title,
      senderName: session.user.name || 'A user',
    });
  } catch (error) {
    console.error("Pusher trigger failed:", error);
    // Don't throw an error here, the main action succeeded.
    // We just log that the real-time part failed.
  }
  // -----------------------------------------

  revalidatePath(`/tasks/${todoListId}`);

  return { success: true, message: `${invitee.name || invitee.username} has been invited!` };
}