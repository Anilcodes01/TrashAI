import { pusher } from "@/app/lib/pusher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const userId = session.user.id;
  const data = await req.formData();
  const socketId = data.get("socket_id") as string;
  const channel = data.get("channel_name") as string;

  const taskId = channel.substring("private-list-".length);

  const list = await prisma.todoList.findFirst({
    where: {
      id: taskId,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId: userId, status: "ACCEPTED" } } },
      ],
    },
  });

  if (!list) {
    return new Response("Forbidden", { status: 403 });
  }

  const userData = {
    user_id: userId,
  };

  const authResponse = pusher.authorizeChannel(socketId, channel, userData);
  return NextResponse.json(authResponse);
}
