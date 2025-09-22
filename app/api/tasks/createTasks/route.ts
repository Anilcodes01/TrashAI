import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authoptions";
import { prisma } from "@/app/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface AIGeneratedResponse {
  title: string;
  tasks: {
    content: string;
    subTasks?: {
      content: string;
    }[];
  }[];
}

function cleanJsonString(rawText: string): string {
  const jsonStartIndex = rawText.indexOf('{');
  const jsonEndIndex = rawText.lastIndexOf('}');

  if (jsonStartIndex === -1 || jsonEndIndex === -1) {
    return rawText;
  }

  return rawText.substring(jsonStartIndex, jsonEndIndex + 1);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await req.json();
    const { description } = body;
    if (!description) {
      return NextResponse.json(
        { message: "A description is required." },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert project manager AI. Based on the following user request, do two things:
      1. Generate a short, descriptive title for the to-do list (5-7 words maximum).
      2. Break down the request into a clear, actionable list of tasks and subtasks.

      User's Request: "${description}"

      RULES:
      - Respond ONLY with a valid JSON object. Do not include any text or markdown formatting before or after the JSON.
      - The JSON object must follow this exact structure: { "title": "A short descriptive title", "tasks": [{ "content": "Task title", "subTasks": [{ "content": "Subtask title" }] }] }
      - If a task doesn't need subtasks, provide an empty array for "subTasks" or omit the key.
    `;
    
    const model = "gemini-2.5-flash"; 
    const contents = [{ role: "user", parts: [{ text: prompt }] }];
    const generationConfig = {
      response_mime_type: "application/json",
    };

    const stream = await ai.models.generateContentStream({
      model,
      contents,
      
    });

    let fullResponseText = "";
    for await (const chunk of stream) {
      const chunkText =chunk.text;
      if (chunkText) {
        fullResponseText += chunkText;
      }
    }

    const cleanResponse = cleanJsonString(fullResponseText);
    const generatedData: AIGeneratedResponse = JSON.parse(cleanResponse);

    const newTodoList = await prisma.todoList.create({
      data: {
        title: generatedData.title,
        description,
        userId,
        tasks: {
          create: generatedData.tasks.map((task, taskIndex) => ({
            content: task.content,
            order: taskIndex,
            subTasks: {
              create: task.subTasks?.map((subTask, subTaskIndex) => ({
                content: subTask.content,
                order: subTaskIndex,
              })),
            },
          })),
        },
      },
      include: { tasks: { include: { subTasks: true } } },
    });

    return NextResponse.json(newTodoList, { status: 201 });
  } catch (error) {
    console.error("Error creating todo list:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Failed to parse AI response. The format was invalid." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}