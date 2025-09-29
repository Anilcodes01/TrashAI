"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TodoList, Task, SubTask, User, Comment } from "@/app/types";
import PusherClient from "pusher-js";
import ProgressBar from "../ui/ProgressBar";
import { LoaderCircle, ServerCrash, ArrowLeft, MessageSquarePlus } from "lucide-react";
import { TodoListHeader } from "./TodoListHeader";
import { TaskList } from "./TaskList";
import { CommentPopover } from "./CommentPopover";
import { AICommandModal } from "./AI/AiCommandModal";
import Image from "next/image";
import { ChatModalWindow } from "./chatModalWindow/ChatModalWindow";
import { AnimatePresence } from 'framer-motion';
import { TbMessagePlus } from "react-icons/tb";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import TextareaAutosize from 'react-textarea-autosize';


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

interface PusherMessagePayload {
  listId: string;
  senderId: string;
}

export default function TodoListDisplay({ taskId }: { taskId: string }) {
  const { data: session } = useSession();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const {
    data: initialTodoList,
    error,
    isLoading,
  } = useSWR<TodoList, FetchError>(`/api/tasks/${taskId}`, fetcher);
  const { mutate } = useSWRConfig();
  const [list, setList] = useState<TodoList | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
 
  const [commentPopover, setCommentPopover] = useState<{
    isOpen: boolean;
    item:
      | ((Task | SubTask) & { itemType: "task" | "subtask"; listId: string })
      | null;
    anchorEl: HTMLElement | null;
  }>({ isOpen: false, item: null, anchorEl: null });
   const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();

  const handleOpenComments = (
    item: Task | SubTask,
    itemType: "task" | "subtask",
    event: React.MouseEvent
  ) => {
    if (!list) return;
    setCommentPopover({
      isOpen: true,
      item: { ...item, itemType, listId: list.id },
      anchorEl: event.currentTarget as HTMLElement,
    });
  };

  const handleCloseComments = () => {
    setCommentPopover({ isOpen: false, item: null, anchorEl: null });
  };

  const handleAICommand = async (prompt: string) => {
    if (!list) return;
    const context = list.tasks.flatMap(task => [
      { id: task.id, type: 'task', content: task.content, completed: task.completed },
      ...(task.subTasks || []).map(sub => ({
        id: sub.id,
        type: 'subtask',
        content: sub.content,
        completed: sub.completed,
        parentId: task.id
      }))
    ]);

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, listId: list.id, context }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "AI command failed");
      }
    } catch (error) {
      console.error("Failed to execute AI command:", error);
      alert(`Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
    }
  };

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
    if (initialTodoList) {
      setList(initialTodoList);
      setListTitle(initialTodoList.title); // Initialize title state

      // Check if this is a new list from the URL
      const isNew = searchParams.get('new') === 'true';
      if (isNew) {
        setIsTitleEditing(true);
      }
    }
  }, [initialTodoList, searchParams]);


  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select(); // Select the text for easy replacement
    }
  }, [isTitleEditing]);

   const handleSaveTitle = async () => {
    if (!list || listTitle.trim() === list.title) {
      setIsTitleEditing(false);
      return;
    }

    try {
      // Optimistically update UI
      const updatedList = { ...list, title: listTitle.trim() };
      setList(updatedList);
      setIsTitleEditing(false);

      // Make API call to update the title in the database
      await axios.patch(`/api/tasks/${list.id}`, { title: listTitle.trim() });
      mutate(`/api/tasks/${taskId}`); // Revalidate SWR cache
    } catch (error) {
      console.error("Failed to save title:", error);
      // Revert on failure
      setListTitle(list.title);
      alert("Could not save the title. Please try again.");
    }
  };

   const handleTitleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent new line
      handleSaveTitle();
      // Optional: focus the "add task" input next
    }
    if (e.key === 'Escape') {
      setListTitle(list?.title || "");
      setIsTitleEditing(false);
    }
  };

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

      channel.bind(
        "item-deleted",
        (data: { itemId: string; itemType: "task" | "subtask" }) => {
          handleUpdate((currentData) => {
            if (data.itemType === "task") {
              return {
                ...currentData,
                tasks: currentData.tasks.filter(
                  (task) => task.id !== data.itemId
                ),
              };
            } else {
              return {
                ...currentData,
                tasks: currentData.tasks.map((task) => ({
                  ...task,
                  subTasks:
                    task.subTasks?.filter((sub) => sub.id !== data.itemId) ||
                    [],
                })),
              };
            }
          });
        }
      );

      channel.bind(
        "comment-added",
        (data: {
          comment: Comment;
          itemId: string;
          itemType: "task" | "subtask";
        }) => {
          const swrKey = `/api/comments/${data.itemType}/${data.itemId}`;
          mutate(swrKey);

          mutate(
            `/api/tasks/${taskId}`,
            (currentData: TodoList | undefined) => {
              if (!currentData) return currentData;
              const updatedTasks = currentData.tasks.map((task) => {
                let newCount = task._count?.comments || 0;
                if (data.itemType === "task" && task.id === data.itemId) {
                  newCount++;
                }
                const updatedSubTasks = task.subTasks.map((sub) => {
                  let newSubCount = sub._count?.comments || 0;
                  if (data.itemType === "subtask" && sub.id === data.itemId) {
                    newSubCount++;
                  }
                  return { ...sub, _count: { comments: newSubCount } };
                });
                return {
                  ...task,
                  _count: { comments: newCount },
                  subTasks: updatedSubTasks,
                };
              });
              return { ...currentData, tasks: updatedTasks };
            },
            false
          );
        }
      );

      return () => pusher.unsubscribe(channelName);
    } catch (e) {
      console.error("Failed to subscribe to Pusher:", e);
    }
  }, [taskId, mutate]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const pusher = getPusherClient();
    const channelName = `private-user-${session.user.id}`;
    
    try {
      const channel = pusher.subscribe(channelName);
      const handleNewMessage = (newMessage: PusherMessagePayload) => {
        if (newMessage.listId === taskId) {
          const isChattingWithSender = isChatModalOpen && document.querySelector(`[data-active-chat-id="${newMessage.senderId}"]`);
          
          if (!isChattingWithSender) {
            setUnreadSenders(prev => new Set(prev).add(newMessage.senderId));
          }
        }
      };

      channel.bind("new-message", handleNewMessage);

      return () => {
        channel.unbind("new-message", handleNewMessage);
      };
    } catch (e) {
      console.error("Failed to subscribe to Pusher for direct messages:", e);
    }
  }, [session, taskId, isChatModalOpen]);

  const handleMarkAsRead = (senderId: string) => {
    setUnreadSenders(prev => {
      const newSet = new Set(prev);
      newSet.delete(senderId);
      return newSet;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
        event.preventDefault();
        setIsAIModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDelete = async (itemId: string, itemType: "task" | "subtask") => {
    if (!list) return;
    const originalList = JSON.parse(JSON.stringify(list));

    let optimisticList;
    if (itemType === "task") {
      optimisticList = {
        ...list,
        tasks: list.tasks.filter((task) => task.id !== itemId),
      };
    } else {
      optimisticList = {
        ...list,
        tasks: list.tasks.map((task) => ({
          ...task,
          subTasks: task.subTasks?.filter((sub) => sub.id !== itemId) || [],
        })),
      };
    }
    setList(optimisticList);

    try {
      const socketId = getPusherClient().connection.socket_id;
      const res = await fetch(`/api/tasks/${list.id}/${itemType}/${itemId}`, {
        method: "DELETE",
        headers: { "x-socket-id": socketId },
      });

      if (!res.ok) throw new Error("Failed to delete item from server.");
      mutate(`/api/tasks/${taskId}`, optimisticList, { revalidate: false });
    } catch (error) {
      console.error("Failed to delete item:", error);
      setList(originalList);
      alert("Could not delete the item. Please try again.");
    }
  };

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

   const startEditing = (item: Task | SubTask | null) => {
    if (!item) {
      setEditingItemId(null);
      return;
    }
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

 

  const handleSaveNewItem = async (content: string, type: 'task' | 'subtask', parentId?: string) => {
    if (!list || !content) return; // Already trimmed in NewItemInput
    
    const tempId = `temp-${Date.now()}`;
    const originalList = JSON.parse(JSON.stringify(list));

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
        headers: { "Content-Type": "application/json", "x-socket-id": socketId },
        body: JSON.stringify({ content, type, parentId }),
      });

      if (!res.ok) throw new Error("Failed to save item on the server.");
      // await mutate(`/api/tasks/${taskId}`);
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
  if (!list || !session?.user) return null;

  const isOwner = session.user.id === list.ownerId;

  return (
    <div className="flex relative flex-col gap-8 items-start w-full">
      <TodoListHeader list={list} isOwner={isOwner} />

      <div className="w-full relative flex flex-col items-center p-8 h-full justify-center space-y-4">
        <div className="w-full max-w-4xl">
    {isTitleEditing ? (
      <TextareaAutosize
      
  ref={titleInputRef}
  value={listTitle}
  onChange={(e) => setListTitle(e.target.value)}
  onBlur={handleSaveTitle}
  onKeyDown={handleTitleKeyDown}
  className="text-3xl font-bold bg-transparent w-full focus:outline-none  rounded-md p-1 -m-1 resize-none"
  minRows={1} // Start with one row
/>
    ) : (
      <h1
        onClick={() => setIsTitleEditing(true)}
        className="text-3xl font-bold w-full mb-6 p-1 -m-1 cursor-pointer rounded-md hover:bg-zinc-800"
      >
        {list.title}
      </h1>
    )}
    <div className="mb-8 mt-6"> {/* Adjusted margin */}
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
          // --- PASS THE SIMPLIFIED PROPS ---
          onSaveNewItem={handleSaveNewItem} // This is the modified function
          handleDelete={handleDelete}
          onOpenComments={handleOpenComments}
        />
         
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="fixed bottom-4 right-16 text-white rounded-full cursor-pointer z-40"
          title="Ask AI"
        >
          <Image src={"/logo/final2.gif"} width={400} height={400} alt="logo1.png" className="rounded-full h-16 w-16"/>
        </button>
        <button
          onClick={() => setIsChatModalOpen(true)}
          className="fixed bottom-16 right-13 cursor-pointer flex items-start justify-start h-16 w-16"
          title="Open Chat"
        >
          <TbMessagePlus size={36} />
          {unreadSenders.size > 0 && (
            <span className="absolute top-0 right-6 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
        </button>
        <CommentPopover
          isOpen={commentPopover.isOpen}
          item={commentPopover.item}
          anchorEl={commentPopover.anchorEl}
          onClose={handleCloseComments}
        />
        <div className="fixed bottom-2 w-full">
           <AICommandModal
            isOpen={isAIModalOpen}
            onClose={() => setIsAIModalOpen(false)}
            onExecute={handleAICommand}
          />
        </div>
         <AnimatePresence>
        {isChatModalOpen && (
          <ChatModalWindow
            isOpen={isChatModalOpen}
            onClose={() => setIsChatModalOpen(false)}
            listId={list.id}
            currentUser={session.user as User}
            unreadSenders={unreadSenders}
            onMarkAsRead={handleMarkAsRead}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}