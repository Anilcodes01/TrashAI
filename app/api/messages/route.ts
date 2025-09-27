// app/api/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { pusher } from "@/app/lib/pusher";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const senderId = session.user.id;
    const { receiverId, content, listId } = await req.json();

    if (!receiverId || !content || !listId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Save the message to the database
    const newMessage = await prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        listId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    // 2. Trigger a Pusher event on the recipient's private channel
    const channelName = `private-user-${receiverId}`;
    await pusher.trigger(channelName, "new-message", newMessage);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}