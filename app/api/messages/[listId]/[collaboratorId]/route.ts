// app/api/messages/[listId]/[collaboratorId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listId: string; collaboratorId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.id;
  const { listId, collaboratorId } =await params;

  try {
    const messages = await prisma.directMessage.findMany({
      where: {
        listId: listId,
        OR: [
          {
            senderId: currentUserId,
            receiverId: collaboratorId,
          },
          {
            senderId: collaboratorId,
            receiverId: currentUserId,
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}