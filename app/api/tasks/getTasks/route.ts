import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if(!session?.user?.id) {
            return NextResponse.json({
                message: 'Unauthorized',
            }, {status: 401});
        }

        const userId = session.user.id;

       const todoLists = await prisma.todoList.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    {
                        collaborators: {
                            some: {
                                userId: userId,
                                status: 'ACCEPTED'
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                title: true,
                ownerId: true, // We need ownerId to calculate the role
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        // CHANGE 2: Map over the selected data to create the final, clean object for the client.
        const listsWithRoles = todoLists.map(list => ({
            id: list.id,
            title: list.title,
            role: list.ownerId === userId ? 'owner' : 'collaborator'
        }));


        return NextResponse.json(listsWithRoles, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({
            message: 'An error occurred while fetching the tasks, please try again',
            error: errorMessage 
        }, {
            status: 500
        });
    }
}