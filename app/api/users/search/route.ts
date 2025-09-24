import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const todoListId = searchParams.get("listId");

  if (!query) {
    return NextResponse.json([]);
  }

  if (!todoListId) {
    return NextResponse.json({ error: "List ID is required" }, { status: 400 });
  }

  const existingCollaborators = await prisma.todoListCollaborator.findMany({
    where: { todoListId },
    select: { userId: true },
  });
  const collaboratorUserIds = existingCollaborators.map((c) => c.userId);

  const listOwner = await prisma.todoList.findUnique({
    where: { id: todoListId },
    select: { ownerId: true },
  });

  const idsToExclude = [...collaboratorUserIds];
  if (listOwner) {
    idsToExclude.push(listOwner.ownerId);
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          id: {
            notIn: idsToExclude,
          },
        },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  });

  return NextResponse.json(users);
}
