"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import PusherClient from "pusher-js";
import {
  ChevronLeft,
  LoaderCircle,
  ServerCrash,
  Archive,
  SquarePen,
  Search,
  Inbox,
  Users,
  MoreHorizontal,
  Trash2,
  MoreVertical,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

interface InvitationCount {
  count: number;
}
interface TodoList {
  id: string;
  title: string;
  role: "owner" | "collaborator";
}

export default function Sidebar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const {
    data: todoLists,
    error,
    isLoading,
  } = useSWR<TodoList[]>("/api/tasks/getTasks", fetcher);
  const { data: invitationData } = useSWR<InvitationCount>(
    "/api/invitations/count",
    fetcher
  );

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const invitationCount = invitationData?.count ?? 0;
  const user = session?.user.name;

  useEffect(() => {
    if (!session?.user?.id) return;
    const pusher = getPusherClient();
    const channelName = `private-user-${session.user.id}`;

    try {
      const channel = pusher.subscribe(channelName);
      channel.bind("invitation-new", () => {
        mutate("/api/invitations/count");
        toast.success("You have a new invitation!");
      });
      return () => {
        pusher.unsubscribe(channelName);
      };
    } catch (e) {
      console.error("Failed to subscribe to Pusher:", e);
    }
  }, [session?.user?.id, mutate]);

  useEffect(() => {
    if (pathname === "/inbox" && invitationCount > 0) {
      mutate("/api/invitations/count", { count: 0 }, { revalidate: false });
    }
  }, [pathname, invitationCount, mutate]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    setOpenMenuId(null);

    const optimisticData = todoLists?.filter((list) => list.id !== taskId);

    toast.promise(
      (async () => {
        await mutate("/api/tasks/getTasks", optimisticData, {
          revalidate: false,
        });
        const response = await fetch(`/api/tasks/deleteTask/${taskId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete the task.");
        }

        if (pathname === `/tasks/${taskId}`) {
          router.push("/");
        }

        return `List "${taskTitle}" deleted.`;
      })(),
      {
        loading: "Deleting list...",
        success: (message) => message,
        error: (err) => {
          mutate("/api/tasks/getTasks");
          return err.message || "Deletion failed. Please try again.";
        },
      }
    );
  };

  return (
    <div
      className={`relative flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-white p-4 transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <Toaster
        position="bottom-right"
        toastOptions={{ style: { background: "#333", color: "#fff" } }}
      />
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 z-20 p-1 bg-zinc-700 text-white rounded-full hover:bg-zinc-600 focus:outline-none"
      >
        <ChevronLeft
          className={`transition-transform duration-300 ${
            !isOpen && "rotate-180"
          }`}
          size={16}
        />
      </button>

      <div
        className={`flex items-center justify-between mb-4 transition-opacity duration-300 ${
          !isOpen && "opacity-0 invisible"
        }`}
      >
        <Link className="text-lg font-bold truncate" href="/">
          {user ? `${user}'s Tasks` : "Tasks"}
        </Link>
        <Link
          className="p-1 rounded-md hover:bg-zinc-700"
          href={"/"}
          aria-label="Create new task list"
        >
          <SquarePen size={16} />
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center text-sm gap-3 hover:bg-zinc-800 py-2 px-2 cursor-pointer rounded-lg"
        >
          <Search size={18} />
          {isOpen && <span className="font-medium">Search</span>}
        </Link>
        <Link
          href="/inbox"
          className="relative flex items-center text-sm gap-3 hover:bg-zinc-800 py-2 px-2 cursor-pointer rounded-lg"
        >
          <Inbox size={18} />
          {isOpen && <span className="font-medium">Inbox</span>}
          {invitationCount > 0 && (
            <div
              className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                isOpen ? "static ml-auto" : ""
              }`}
            >
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                {invitationCount}
              </span>
            </div>
          )}
        </Link>
      </div>

      <div className="flex-grow mt-6 overflow-y-auto">
        <h2
          className={`text-sm text-zinc-400 mb-2 px-2 transition-opacity duration-300 ${
            !isOpen && "opacity-0 invisible"
          }`}
        >
          History
        </h2>
        {isLoading && (
          <div className="flex items-center gap-3 p-2 text-zinc-400">
            <LoaderCircle className="animate-spin" size={18} />
            <span className={`${!isOpen && "hidden"}`}>Loading...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-2 text-red-400">
            <ServerCrash size={18} />
            <span className={`${!isOpen && "hidden"}`}>Error</span>
          </div>
        )}
        {todoLists && todoLists.length === 0 && (
          <div className="flex items-center gap-3 p-2 text-zinc-400">
            <Archive size={18} />
            <span className={`text-sm ${!isOpen && "hidden"}`}>
              No lists yet.
            </span>
          </div>
        )}

        <ul className="space-y-1">
          {todoLists?.map((list) => {
            const isActive = pathname === `/tasks/${list.id}`;
            return (
              <li key={list.id} className="relative group">
                <Link
                  href={`/tasks/${list.id}`}
                  className={`flex items-center justify-between w-full text-left py-2 px-2 rounded-lg transition-colors ${
                    isActive ? "bg-zinc-800" : "hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    {list.role === "collaborator" ? (
                      <Users
                        className="text-blue-400 mr-3 flex-shrink-0"
                        size={16}
                      />
                    ) : (
                      <div className="w-4 mr-3"></div>
                    )}
                    <span
                      className={`text-sm truncate transition-opacity duration-300 ${
                        !isOpen && "opacity-0 invisible"
                      }`}
                    >
                      {list.title}
                    </span>
                  </div>
                </Link>

                {isOpen && list.role === "owner" && (
                  <div
                    className={`absolute right-1 top-1/2 -translate-y-1/2 ${
                      !isActive && "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === list.id ? null : list.id);
                      }}
                      className="p-1 rounded-md hover:bg-zinc-700"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                )}

                {openMenuId === list.id && (
                  <div className="absolute top-10 right-0 z-20 w-36 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg py-1">
                    <button
                      onClick={() => handleDeleteTask(list.id, list.title)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 size={14} />
                      <span>Delete List</span>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
