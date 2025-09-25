import { pusher } from '@/app/lib/pusher';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authoptions';
import { NextResponse } from 'next/server';
import {prisma} from '@/app/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const userId = session.user.id;
  const data = await req.formData();
  const socketId = data.get('socket_id') as string;
  const channel = data.get('channel_name') as string;

  if (channel.startsWith('private-user-')) {
    const channelUserId = channel.substring('private-user-'.length);
    if (userId === channelUserId) {
      const authResponse = pusher.authorizeChannel(socketId, channel);
      return NextResponse.json(authResponse);
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (channel.startsWith('private-list-')) {
    const taskId = channel.substring('private-list-'.length);

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
      return new Response('Forbidden', { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  return new Response('Channel not supported', { status: 400 });
}