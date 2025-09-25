'use server';

import { prisma } from '@/app/lib/prisma';
import { pusher } from '@/app/lib/pusher';

export async function sendInvitation(listId: string, invitedUserId: string) {
    // Your permission checks and logic here

    const newInvitation = await prisma.todoListCollaborator.create({
        data: {
            todoListId: listId,
            userId: invitedUserId,
            status: 'PENDING',
        },
        include: {
            todoList: {
                select: {
                    id: true,
                    title: true,
                    owner: {
                        select: { name: true, username: true },
                    },
                },
            },
        },
    });

    await pusher.trigger(
        `private-user-${invitedUserId}`,
        'invitation-new',
        newInvitation
    );

    return { success: true };
}