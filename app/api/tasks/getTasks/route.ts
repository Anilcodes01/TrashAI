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
            }, {status: 401})
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
            orderBy: { updatedAt: 'desc' }
        });
        
        const listsWithRoles = todoLists.map(list => ({
            ...list,
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
        })
    }
}