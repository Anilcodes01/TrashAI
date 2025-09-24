"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  MessageSquarePlus,
  ChevronLeft,
  LoaderCircle,
  ServerCrash,
  Archive,
  Pencil,
  SquarePen,
  Search,
  Inbox,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TodoList {
  id: string;
  title: string;
  role: 'owner' | 'collaborator'; // <-- Add the role
}

export default function Sidebar({ initialInvitationCount }: { initialInvitationCount: number }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);

  const user = session?.user.name;
  const router = useRouter();
  const {
    data: todoLists,
    error,
    isLoading,
  } = useSWR<TodoList[]>("/api/tasks/getTasks", fetcher);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div
      className={`relative flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-white  p-4 transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 z-10 p-1 bg-gray-700 text-white rounded-full hover:bg-gray-600 focus:outline-none"
      >
        <ChevronLeft
          className={`transition-transform duration-300 ${
            !isOpen && "rotate-180"
          }`}
          size={16}
        />
      </button>

      <div className="flex justify-between">
        <div>
          <Link className="text-lg font-bold" href="/">
            {user}&apos;s Trash
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <Link className="hover:text-zinc-600" href={"/"}>
            <SquarePen size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div onClick={() => {
          router.push('/')
        }} className="flex items-center text-sm justify- gap-2 hover:bg-zinc-600 py-1 px-2 cursor-pointer rounded-lg">
          <Search size={16} />
          <span>Search</span>
        </div>
         <div 
          onClick={() => router.push('/inbox')} 
          className="flex items-center  text-sm gap-2 hover:bg-zinc-600 py-1 px-2 cursor-pointer rounded-lg"
        >
          <Inbox size={16} />
          {isOpen && <span>Inbox</span>}

          {initialInvitationCount > 0 && (
            <span 
              className={`absolute right-8 transition-opacity duration-300 ${isOpen ? "ml-[68px]" : "ml-0"}`}
              title={`${initialInvitationCount} new invitations`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-grow mt-8 overflow-y-auto">
        <h2
          className={`text-sm text-gray-400 mb-2 transition-opacity duration-300 ${
            !isOpen && "opacity-0"
          }`}
        >
          History
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center p-2 text-gray-400">
            <LoaderCircle className="animate-spin" />
            <span className={`ml-4 ${!isOpen && "hidden"}`}>Loading...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center p-2 text-red-400">
            <ServerCrash />
            <span className={`ml-4 ${!isOpen && "hidden"}`}>Error</span>
          </div>
        )}

        {todoLists && todoLists.length === 0 && (
          <div className="flex items-center p-2 text-gray-400">
            <Archive />
            <span className={`ml-4 text-sm ${!isOpen && "hidden"}`}>
              No lists yet.
            </span>
          </div>
        )}

          {todoLists &&
        todoLists.map((list) => (
          <Link
            key={list.id}
            href={`/tasks/${list.id}`}
            className="flex items-center py-2 px-2 rounded-lg hover:bg-zinc-700 truncate"
          >
            {list.role === 'collaborator' ? (
              <Users className="text-blue-400 mr-3 flex-shrink-0" size={16} />
            ): ""}

            <span
              className={`text-sm transition-opacity duration-300 ${
                !isOpen && "opacity-0 whitespace-nowrap"
              }`}
            >
              {list.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
