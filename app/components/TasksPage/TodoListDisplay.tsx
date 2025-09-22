"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { TodoList } from '@/app/types';
import { Check, Square, LoaderCircle, ServerCrash, ArrowLeft } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export default function TodoListDisplay({ taskId }: { taskId: string }) {
  const { data: initialTodoList, error, isLoading } = useSWR<TodoList>(`/api/tasks/${taskId}`, fetcher);

  const [list, setList] = useState<TodoList | null>(null);

  useEffect(() => {
    if (initialTodoList) {
      setList(initialTodoList);
    }
  }, [initialTodoList]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <ServerCrash size={48} />
        <h2 className="text-2xl font-bold mt-4">Failed to Load List</h2>
        <p>{error.status === 404 ? "This to-do list could not be found." : "Please try again later."}</p>
        <Link href="/" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
          <ArrowLeft className="mr-2 h-5 w-5" />
          Go Back Home
        </Link>
      </div>
    );
  }

  if (!list) return null;

  const handleToggle = (itemId: string, isSubTask: boolean) => {
    setList(currentList => {
      if (!currentList) return null;
      const newList = { ...currentList };
      newList.tasks = newList.tasks.map(task => {
        if (isSubTask) {
          const subTasks = task.subTasks.map(sub => 
            sub.id === itemId ? { ...sub, completed: !sub.completed } : sub
          );
          return { ...task, subTasks };
        } else {
          return task.id === itemId ? { ...task, completed: !task.completed } : task;
        }
      });
      return newList;
    });
  };

  return (
    <div className="flex flex-col gap-8 items-start w-full lg:max-w-4xl mx-auto">
      <div className="w-full">
        <h1 className="text-4xl font-bold mb-2">{list.title}</h1>
        <p className="text-gray-600 italic">Original prompt: "{list.description}"</p>
      </div>
      <div className="w-full space-y-4">
        {list.tasks.map((task) => (
          <div key={task.id} className="p-4 border rounded-lg bg-[#0e1117] shadow-sm">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleToggle(task.id, false)}
            >
              {task.completed ? <Check className="text-green-500"/> : <Square className="text-gray-400"/>}
              <span className={`text-base ${task.completed ? 'line-through text-gray-500' : ''}`}>
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
                    {subTask.completed ? <Check size={16} className="text-green-500"/> : <Square size={16} className="text-gray-400"/>}
                    <span className={`text-sm ${subTask.completed ? 'line-through text-gray-500' : ''}`}>
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