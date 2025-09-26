import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { pusher } from "@/app/lib/pusher";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1),
  listId: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemType: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { itemType, itemId } =await params;

  try {
    const comments = await prisma.comment.findMany({
      where: itemType === "task" ? { taskId: itemId } : { subTaskId: itemId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise< { itemType: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { itemType, itemId } =await params;
  const socketId = req.headers.get("x-socket-id");
  const body = await req.json();

  const validation = createCommentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: validation.error.issues },
      { status: 400 }
    );
  }

  const { content, listId } = validation.data;

  try {
    const newComment = await prisma.comment.create({
      data: {
        content: content,
        authorId: session.user.id,
        taskId: itemType === "task" ? itemId : undefined,
        subTaskId: itemType === "subtask" ? itemId : undefined,
      },
      include: {
        author: { select: { id: true, name: true, username: true } },
      },
    });

    const channelName = `private-list-${listId}`;
    const eventName = "comment-added";
    const payload = {
      comment: newComment,
      itemType,
      itemId,
    };

    if (socketId) {
      await pusher.trigger(channelName, eventName, payload, {
        socket_id: socketId,
      });
    } else {
      await pusher.trigger(channelName, eventName, payload);
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
