"use client";

import { useState } from "react";
import useSWR from "swr";
import { MessageSquarePlus, ChevronLeft, LoaderCircle, ServerCrash, Archive } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TodoList {
  id: string;
  title: string;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const { data: todoLists, error, isLoading } = useSWR<TodoList[]>('/api/tasks/getTasks', fetcher);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div
      className={`relative flex flex-col h-full  text-white  p-4 transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 z-10 p-1 bg-gray-700 text-white rounded-full hover:bg-gray-600 focus:outline-none"
      >
        <ChevronLeft className={`transition-transform duration-300 ${!isOpen && "rotate-180"}`} size={16} />
      </button>

      <button className="flex items-center w-full p-2 mb-6 bg-gray-600 rounded-lg hover:bg-blue-500">
        <MessageSquarePlus size={24} />
        <span className={`ml-4 font-semibold transition-opacity duration-300 ${!isOpen && "opacity-0 whitespace-nowrap"}`}>
          New List
        </span>
      </button>

      <div className="flex-grow overflow-y-auto">
        <h2 className={`text-sm text-gray-400 mb-2 transition-opacity duration-300 ${!isOpen && "opacity-0"}`}>
          History
        </h2>
        
        {isLoading && (
          <div className="flex items-center justify-center p-2 text-gray-400">
            <LoaderCircle className="animate-spin" />
            <span className={`ml-4 ${!isOpen && 'hidden'}`}>Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center p-2 text-red-400">
            <ServerCrash />
            <span className={`ml-4 ${!isOpen && 'hidden'}`}>Error</span>
          </div>
        )}

        {todoLists && todoLists.length === 0 && (
            <div className="flex items-center p-2 text-gray-400">
                <Archive />
                <span className={`ml-4 text-sm ${!isOpen && 'hidden'}`}>No lists yet.</span>
            </div>
        )}

        {todoLists && todoLists.map((task) => (
        <Link
          key={task.id}
          href={`/tasks/${task.id}`} // Use the dynamic route
          className="flex items-center p-2 rounded-md hover:bg-gray-700 truncate"
        >
          <span className="flex-shrink-0">📝</span>
          <span className={`ml-4 transition-opacity duration-300 ${!isOpen && "opacity-0 whitespace-nowrap"}`}>
            {task.title}
          </span>
        </Link>
      ))}
      </div>

    
    </div>
  );
}