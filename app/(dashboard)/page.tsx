"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainTextArea from '../components/main/TextArea';
import { TodoList } from '@/app/types';

export default function HomePage() {
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  console.log(todoList)

  const handleGenerateList = async (prompt: string) => {
    if (!prompt.trim()) {
      setError("Please enter a description for your to-do list.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTodoList(null);
    try {
      const response = await fetch('/api/tasks/createTasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate list.');
      }
      const newTodoList: TodoList = await response.json();
      
      router.push(`/tasks/${newTodoList.id}`);

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto dark:bg-gray-900 p-8 flex flex-col items-center gap-12">
      <MainTextArea onGenerate={handleGenerateList} isLoading={isLoading} />
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}