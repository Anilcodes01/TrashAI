"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TodoList, Task, SubTask } from "@/app/types";
import {
  Check,
  Square,
  LoaderCircle,
  ServerCrash,
  ArrowLeft,
} from "lucide-react";
import { SharePopover } from "../main/ShareProvider";
import { Avatar } from "../ui/avatar";

class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

const fetcher = async (url: string): Promise<TodoList> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchError(
      "An error occurred while fetching the data.",
      res.status
    );
  }
  return res.json();
};

export default function TodoListDisplay({ taskId }: { taskId: string }) {
  const { data: session } = useSession();
  const {
    data: initialTodoList,
    error,
    isLoading,
  } = useSWR<TodoList, FetchError>(`/api/tasks/${taskId}`, fetcher);
  const { mutate } = useSWRConfig();
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [list, setList] = useState<TodoList | null>(null);

  useEffect(() => {
    if (initialTodoList) {
      setList(initialTodoList);
    }
  }, [initialTodoList]);

  const handleToggle = async (itemId: string, isSubTask: boolean) => {
    if (!list) return;

    const itemType = isSubTask ? "subtask" : "task";
    let newCompletedState: boolean | undefined;

    const originalList = JSON.parse(JSON.stringify(list));

    const updatedList = {
      ...list,
      tasks: list.tasks.map((task) => {
        if (!isSubTask && task.id === itemId) {
          newCompletedState = !task.completed;
          return { ...task, completed: newCompletedState };
        }
        if (isSubTask) {
          return {
            ...task,
            subTasks: task.subTasks.map((sub) => {
              if (sub.id === itemId) {
                newCompletedState = !sub.completed;
                return { ...sub, completed: newCompletedState };
              }
              return sub;
            }),
          };
        }
        return task;
      }),
    };

    setList(updatedList);

    try {
      const res = await fetch(`/api/tasks/${list.id}/${itemType}/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: newCompletedState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task on the server.");
      }

      mutate(`/api/tasks/${taskId}`, updatedList, { revalidate: false });
    } catch (error) {
      console.error("Failed to update:", error);
      setList(originalList);
      alert("Could not update the task. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoaderCircle className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <ServerCrash size={48} />
        <h2 className="text-2xl font-bold mt-4">Failed to Load List</h2>
        <p>
          {error.status === 404
            ? "This to-do list could not be found or you don't have access."
            : "Please try again later."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Go Back Home
        </Link>
      </div>
    );
  }

  if (!list) return null;

  const isOwner = session?.user?.id === list.ownerId;
  const participants = [list.owner, ...list.collaborators.map((c) => c.user)];

  return (
    <div className="flex flex-col gap-8 items-start w-full">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-sm">{list.title}</h1>
        <div className="relative flex gap-4 items-center lg:mr-8">
          <p className="text-zinc-600 text-sm">Edited just now</p>

          {participants.length > 1 && (
            <div className="flex items-center">
              {participants.map((participant, index) => (
                <div key={participant.id} className={index > 0 ? "-ml-2" : ""}>
                  <Avatar name={participant.name || participant.username} />
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => setIsSharePopoverOpen((prev) => !prev)}
                className="text-sm cursor-pointer hover:text-zinc-600"
              >
                Share
              </button>
              {isSharePopoverOpen && (
                <SharePopover
                  listId={list.id}
                  onClose={() => setIsSharePopoverOpen(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center p-8 h-full justify-center space-y-4">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl w-full mb-6">{list.title}</h1>
        </div>
        {list.tasks.map((task) => (
          <div key={task.id} className="p-4 max-w-4xl w-full rounded-lg">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleToggle(task.id, false)}
            >
              {task.completed ? (
                <Check className="text-green-500" />
              ) : (
                <Square className="text-gray-400" />
              )}
              <span
                className={`text-base font-bold ${
                  task.completed ? "line-through text-gray-500" : ""
                }`}
              >
                {task.content}
              </span>
            </div>
            {task.subTasks && task.subTasks.length > 0 && (
              <div className="mt-3 pl-8 space-y-2">
                {task.subTasks.map((subTask) => (
                  <div
                    key={subTask.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => handleToggle(subTask.id, true)}
                  >
                    {subTask.completed ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span
                      className={`text-sm ${
                        subTask.completed ? "line-through text-gray-500" : ""
                      }`}
                    >
                      {subTask.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
