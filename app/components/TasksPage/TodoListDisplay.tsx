"use client";

import { useState, useEffect, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TodoList, Task, SubTask } from "@/app/types";
import PusherClient from "pusher-js";
import {
  Check,
  Square,
  LoaderCircle,
  ServerCrash,
  ArrowLeft,
} from "lucide-react";
import { SharePopover } from "../main/ShareProvider";
import { Avatar } from "../ui/avatar";

// Helper Error class for fetcher
class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

// Data fetching function for SWR
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

// Singleton pattern for Pusher client instance
let pusherClient: PusherClient | null = null;
const getPusherClient = () => {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherClient;
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

  // State for inline editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync SWR data with local component state
  useEffect(() => {
    if (initialTodoList) {
      setList(initialTodoList);
    }
  }, [initialTodoList]);

  // Focus the input field when editing begins
  useEffect(() => {
    if (editingItemId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingItemId]);

  // Setup Pusher subscriptions and event bindings
  useEffect(() => {
    if (!taskId) return;

    const pusher = getPusherClient();
    const channelName = `private-list-${taskId}`;

    try {
      const channel = pusher.subscribe(channelName);

      // Bind to completion status updates
      channel.bind(
        "item-updated",
        (data: {
          itemId: string;
          itemType: "task" | "subtask";
          completed: boolean;
        }) => {
          mutate(
            `/api/tasks/${taskId}`,
            (currentData: TodoList | undefined) => {
              if (!currentData) return currentData;

              const updatedTasks = currentData.tasks.map((task) => {
                if (data.itemType === "task" && task.id === data.itemId) {
                  return { ...task, completed: data.completed };
                }
                if (data.itemType === "subtask") {
                  const updatedSubTasks = task.subTasks.map((sub) =>
                    sub.id === data.itemId
                      ? { ...sub, completed: data.completed }
                      : sub
                  );
                  return { ...task, subTasks: updatedSubTasks };
                }
                return task;
              });

              return { ...currentData, tasks: updatedTasks };
            },
            { revalidate: false }
          );
        }
      );

      // Bind to content/text updates
      channel.bind(
        "item-content-updated",
        (data: {
          itemId: string;
          itemType: "task" | "subtask";
          content: string;
        }) => {
          mutate(
            `/api/tasks/${taskId}`,
            (currentData: TodoList | undefined) => {
              if (!currentData) return currentData;

              const updatedTasks = currentData.tasks.map((task) => {
                if (data.itemType === "task" && task.id === data.itemId) {
                  return { ...task, content: data.content };
                }
                if (data.itemType === "subtask") {
                  const updatedSubTasks = task.subTasks.map((sub) =>
                    sub.id === data.itemId
                      ? { ...sub, content: data.content }
                      : sub
                  );
                  return { ...task, subTasks: updatedSubTasks };
                }
                return task;
              });

              return { ...currentData, tasks: updatedTasks };
            },
            { revalidate: false }
          );
        }
      );

      // Cleanup on component unmount
      return () => {
        pusher.unsubscribe(channelName);
      };
    } catch (e) {
      console.error("Failed to subscribe to Pusher:", e);
    }
  }, [taskId, mutate]);

  // Handles toggling the 'completed' state of a task or subtask
  const handleToggle = async (itemId: string, isSubTask: boolean) => {
    if (!list || editingItemId === itemId) return; // Prevent toggle when editing

    const itemType = isSubTask ? "subtask" : "task";
    let newCompletedState: boolean | undefined;

    const originalList = JSON.parse(JSON.stringify(list)); // Deep copy for rollback

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

    setList(updatedList); // Optimistic UI update

    try {
      const pusher = getPusherClient();
      const socketId = pusher.connection.socket_id;

      const res = await fetch(`/api/tasks/${list.id}/${itemType}/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-socket-id": socketId,
        },
        body: JSON.stringify({ completed: newCompletedState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task on the server.");
      }

      mutate(`/api/tasks/${taskId}`, updatedList, { revalidate: false });
    } catch (error) {
      console.error("Failed to update:", error);
      setList(originalList); // Rollback on failure
      alert("Could not update the task. Please try again.");
    }
  };

  // Puts a task/subtask into editing mode
  const startEditing = (item: Task | SubTask) => {
    setEditingItemId(item.id);
    setEditText(item.content);
  };

  // Saves the edited content of a task or subtask
  const handleSaveEdit = async () => {
    if (!editingItemId || !list) return;

    let originalItem: (Task | SubTask) | undefined;
    let isSubTask = false;
    for (const task of list.tasks) {
      if (task.id === editingItemId) {
        originalItem = task;
        break;
      }
      const subTask = task.subTasks.find((sub) => sub.id === editingItemId);
      if (subTask) {
        originalItem = subTask;
        isSubTask = true;
        break;
      }
    }

    // Exit if there's no change
    if (!originalItem || originalItem.content === editText.trim()) {
      setEditingItemId(null);
      return;
    }

    const itemType = isSubTask ? "subtask" : "task";
    const newContent = editText.trim();

    // Optimistic UI update
    const originalList = JSON.parse(JSON.stringify(list));
    const updatedList = {
      ...list,
      tasks: list.tasks.map((task) => {
        if (!isSubTask && task.id === editingItemId) {
          return { ...task, content: newContent };
        }
        if (isSubTask) {
          return {
            ...task,
            subTasks: task.subTasks.map((sub) =>
              sub.id === editingItemId ? { ...sub, content: newContent } : sub
            ),
          };
        }
        return task;
      }),
    };
    setList(updatedList);
    setEditingItemId(null); // Exit editing mode

    try {
      const pusher = getPusherClient();
      const socketId = pusher.connection.socket_id;

      const res = await fetch(
        `/api/tasks/${list.id}/${itemType}/${editingItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-socket-id": socketId,
          },
          body: JSON.stringify({ content: newContent }),
        }
      );

      if (!res.ok) throw new Error("Failed to update task content on server.");

      mutate(`/api/tasks/${taskId}`, updatedList, { revalidate: false });
    } catch (error) {
      console.error("Failed to update content:", error);
      setList(originalList); // Revert on failure
      alert("Could not update the task content. Please try again.");
    }
  };

  // Handles keyboard events for the input field (Enter and Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingItemId(null);
    }
  };

  // Loading State UI
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoaderCircle className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  // Error State UI
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

  // Null state if list hasn't loaded yet
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
            <div className="flex items-center gap-3">
              <div
                className="cursor-pointer"
                onClick={() => handleToggle(task.id, false)}
              >
                {task.completed ? (
                  <Check className="text-green-500" />
                ) : (
                  <Square className="text-gray-400" />
                )}
              </div>
              {editingItemId === task.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="text-base font-bold bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500 w-full"
                />
              ) : (
                <span
                  onClick={() => startEditing(task)}
                  className={`text-base font-bold cursor-pointer ${
                    task.completed ? "line-through text-gray-500" : ""
                  }`}
                >
                  {task.content}
                </span>
              )}
            </div>
            {task.subTasks && task.subTasks.length > 0 && (
              <div className="mt-3 pl-8 space-y-2">
                {task.subTasks.map((subTask) => (
                  <div key={subTask.id} className="flex items-center gap-3">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleToggle(subTask.id, true)}
                    >
                      {subTask.completed ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </div>
                    {editingItemId === subTask.id ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="text-sm bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500 w-full"
                      />
                    ) : (
                      <span
                        onClick={() => startEditing(subTask)}
                        className={`text-sm cursor-pointer ${
                          subTask.completed ? "line-through text-gray-500" : ""
                        }`}
                      >
                        {subTask.content}
                      </span>
                    )}
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