"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use router for navigation
import MainTextArea from '../components/main/TextArea';

import { TodoList } from '@/app/types';

export default function HomePage() {
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Initialize the router

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
      
      // Instead of displaying here, redirect to the new list's page
      router.push(`/tasks/${newTodoList.id}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto  dark:bg-gray-900 p-8 flex  flex-col items-center gap-12">
      <MainTextArea onGenerate={handleGenerateList} isLoading={isLoading} />
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {/* TodoResult is no longer needed here as we redirect */}
    </div>
  );
}