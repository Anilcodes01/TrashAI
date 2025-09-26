"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TodoList, Task, SubTask } from "@/app/types";
import PusherClient from "pusher-js";
import ProgressBar from "../ui/ProgressBar";
import { LoaderCircle, ServerCrash, ArrowLeft } from "lucide-react";
import { TodoListHeader } from "./TodoListHeader";
import { TaskList } from "./TaskList";

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
  const [list, setList] = useState<TodoList | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [addingItem, setAddingItem] = useState<{
    type: "task" | "subtask";
    parentId?: string;
  } | null>(null);

  const progressPercentage = useMemo(() => {
    if (!list || !list.tasks || list.tasks.length === 0) return 0;
    let totalItems = 0;
    let completedItems = 0;
    list.tasks.forEach((task) => {
      totalItems++;
      if (task.completed) completedItems++;
      if (task.subTasks) {
        task.subTasks.forEach((subTask) => {
          totalItems++;
          if (subTask.completed) completedItems++;
        });
      }
    });
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  }, [list]);

  useEffect(() => {
    if (initialTodoList) setList(initialTodoList);
  }, [initialTodoList]);

  useEffect(() => {
    if (editingItemId && inputRef.current) inputRef.current.focus();
  }, [editingItemId]);

  useEffect(() => {
    if (!taskId) return;
    const pusher = getPusherClient();
    const channelName = `private-list-${taskId}`;
    try {
      const channel = pusher.subscribe(channelName);
      const handleUpdate = (updateFn: (currentData: TodoList) => TodoList) => {
        mutate(
          `/api/tasks/${taskId}`,
          (currentData: TodoList | undefined) => {
            if (!currentData) return currentData;
            return updateFn(currentData);
          },
          { revalidate: false }
        );
      };

      channel.bind(
        "item-updated",
        (data: {
          itemId: string;
          itemType: "task" | "subtask";
          completed: boolean;
        }) => {
          handleUpdate((current) => ({
            ...current,
            tasks: current.tasks.map((task) => {
              if (data.itemType === "task" && task.id === data.itemId)
                return { ...task, completed: data.completed };
              if (data.itemType === "subtask") {
                return {
                  ...task,
                  subTasks: task.subTasks.map((sub) =>
                    sub.id === data.itemId
                      ? { ...sub, completed: data.completed }
                      : sub
                  ),
                };
              }
              return task;
            }),
          }));
        }
      );

      channel.bind(
        "item-content-updated",
        (data: {
          itemId: string;
          itemType: "task" | "subtask";
          content: string;
        }) => {
          handleUpdate((current) => ({
            ...current,
            tasks: current.tasks.map((task) => {
              if (data.itemType === "task" && task.id === data.itemId)
                return { ...task, content: data.content };
              if (data.itemType === "subtask") {
                return {
                  ...task,
                  subTasks: task.subTasks.map((sub) =>
                    sub.id === data.itemId
                      ? { ...sub, content: data.content }
                      : sub
                  ),
                };
              }
              return task;
            }),
          }));
        }
      );

      channel.bind(
        "item-added",
        (data: {
          item: Task | SubTask;
          itemType: "task" | "subtask";
          parentId?: string;
        }) => {
          handleUpdate((currentData) => {
            if (data.itemType === "task") {
              return {
                ...currentData,
                tasks: [...currentData.tasks, data.item as Task],
              };
            } else {
              const updatedTasks = currentData.tasks.map((task) => {
                if (task.id === data.parentId) {
                  return {
                    ...task,
                    subTasks: [...(task.subTasks || []), data.item as SubTask],
                  };
                }
                return task;
              });
              return { ...currentData, tasks: updatedTasks };
            }
          });
        }
      );

      return () => pusher.unsubscribe(channelName);
    } catch (e) {
      console.error("Failed to subscribe to Pusher:", e);
    }
  }, [taskId, mutate]);

  const handleToggle = async (itemId: string, isSubTask: boolean) => {
    if (!list || editingItemId === itemId) return;
    const itemType = isSubTask ? "subtask" : "task";
    const originalList = JSON.parse(JSON.stringify(list));
    let newCompletedState: boolean | undefined;

    const updatedList = {
      ...list,
      tasks: list.tasks.map((task) => {
        if (!isSubTask && task.id === itemId) {
          newCompletedState = !task.completed;
          return { ...task, completed: newCompletedState };
        }
        if (isSubTask) {
          const subTask = task.subTasks.find((sub) => sub.id === itemId);
          if (subTask) {
            newCompletedState = !subTask.completed;
            return {
              ...task,
              subTasks: task.subTasks.map((sub) =>
                sub.id === itemId
                  ? {
                      ...sub,
                      completed:
                        typeof newCompletedState === "boolean"
                          ? newCompletedState
                          : false,
                    }
                  : sub
              ),
            };
          }
        }
        return task;
      }),
    };

    setList(updatedList);

    try {
      const socketId = getPusherClient().connection.socket_id;
      const res = await fetch(`/api/tasks/${list.id}/${itemType}/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-socket-id": socketId,
        },
        body: JSON.stringify({ completed: newCompletedState }),
      });
      if (!res.ok) throw new Error("Failed to update task on the server.");
      mutate(`/api/tasks/${taskId}`, updatedList, { revalidate: false });
    } catch (error) {
      console.error("Failed to update:", error);
      setList(originalList);
    }
  };

  const startEditing = (item: Task | SubTask) => {
    setAddingItem(null);
    setEditingItemId(item.id);
    setEditText(item.content);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !list) return;
    let isSubTask = false;
    let originalContent: string | undefined;

    for (const task of list.tasks) {
      if (task.id === editingItemId) {
        originalContent = task.content;
        break;
      }
      const subTask = task.subTasks.find((sub) => sub.id === editingItemId);
      if (subTask) {
        originalContent = subTask.content;
        isSubTask = true;
        break;
      }
    }

    if (originalContent === editText.trim()) {
      setEditingItemId(null);
      return;
    }

    const itemType = isSubTask ? "subtask" : "task";
    const newContent = editText.trim();
    const originalList = JSON.parse(JSON.stringify(list));

    const updatedList = {
      ...list,
      tasks: list.tasks.map((task) => {
        if (!isSubTask && task.id === editingItemId)
          return { ...task, content: newContent };
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
    setEditingItemId(null);

    try {
      const socketId = getPusherClient().connection.socket_id;
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
      if (!res.ok) throw new Error("Failed to update content on server.");
      mutate(`/api/tasks/${taskId}`, updatedList, { revalidate: false });
    } catch (error) {
      console.error("Failed to update content:", error);
      setList(originalList);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveEdit();
    else if (e.key === "Escape") setEditingItemId(null);
  };

  const handleStartAddTask = () => {
    setEditingItemId(null);
    setAddingItem({ type: "task" });
  };

  const handleStartAddSubTask = (parentId: string) => {
    setEditingItemId(null);
    setAddingItem({ type: "subtask", parentId });
  };

  const handleCancelAdd = () => {
    setAddingItem(null);
  };

  const handleSaveNewItem = async (content: string) => {
    if (!list || !addingItem) return;

    const { type, parentId } = addingItem;
    const tempId = `temp-${Date.now()}`;
    const originalList = JSON.parse(JSON.stringify(list));
    setAddingItem(null);

    let optimisticList: TodoList;
    if (type === "task") {
      const newTask: Task = {
        id: tempId,
        content,
        completed: false,
        order: list.tasks.length,
        createdAt: new Date(),
        updatedAt: new Date(),
        subTasks: [],
      };
      optimisticList = { ...list, tasks: [...list.tasks, newTask] };
    } else {
      const newSubTask: SubTask = {
        id: tempId,
        content,
        completed: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      optimisticList = {
        ...list,
        tasks: list.tasks.map((t) =>
          t.id === parentId
            ? { ...t, subTasks: [...(t.subTasks || []), newSubTask] }
            : t
        ),
      };
    }
    setList(optimisticList);

    try {
      const socketId = getPusherClient().connection.socket_id;
      const res = await fetch(`/api/tasks/${list.id}/append`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-socket-id": socketId,
        },
        body: JSON.stringify({ content, type, parentId }),
      });

      if (!res.ok) throw new Error("Failed to save item on the server.");
      await mutate(`/api/tasks/${taskId}`);
    } catch (error) {
      console.error("Failed to save new item:", error);
      setList(originalList);
      alert("Could not add item. Please try again.");
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <LoaderCircle className="animate-spin text-gray-500" size={48} />
      </div>
    );
  if (error)
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
  if (!list) return null;

  const isOwner = session?.user?.id === list.ownerId;

  return (
    <div className="flex flex-col gap-8 items-start w-full">
      <TodoListHeader list={list} isOwner={isOwner} />

      <div className="w-full flex flex-col items-center p-8 h-full justify-center space-y-4">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl w-full mb-6">{list.title}</h1>
          <div className="mb-8">
            <ProgressBar progress={progressPercentage} />
          </div>
        </div>
        <TaskList
          tasks={list.tasks}
          editingItemId={editingItemId}
          editText={editText}
          handleToggle={handleToggle}
          startEditing={startEditing}
          handleSaveEdit={handleSaveEdit}
          handleKeyDown={handleKeyDown}
          setEditText={setEditText}
          inputRef={inputRef}
          addingItem={addingItem}
          onStartAddTask={handleStartAddTask}
          onStartAddSubTask={handleStartAddSubTask}
          onSaveNewItem={handleSaveNewItem}
          onCancelAdd={handleCancelAdd}
        />
      </div>
    </div>
  );
}
