// app/api/lists/[listId]/collaborators/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { listId } =await params;
  const userId = session.user.id;

  try {
    const list = await prisma.todoList.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId, status: "ACCEPTED" } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, username: true },
        },
        collaborators: {
          where: { status: "ACCEPTED" },
          include: {
            user: {
              select: { id: true, name: true, email: true, username: true },
            },
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ message: "List not found" }, { status: 404 });
    }

    const owner = list.owner;
    const collaborators = list.collaborators.map((c) => c.user);
    const allUsers = [owner, ...collaborators].filter(
      // Deduplicate and remove current user
      (user, index, self) =>
        user.id !== userId &&
        index === self.findIndex((u) => u.id === user.id)
    );

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Failed to fetch collaborators:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}