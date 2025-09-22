"use client";

import { useState } from 'react';
import MainTextArea from './components/main/TextArea';
import TodoResult from './components/main/Result';  
import { TodoList } from '@/app/types'; 

export default function DashboardPage() {
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateList = async (prompt: string) => {
    if (!prompt.trim()) {
      setError("Please enter a description for your to-do list.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTodoList(null); 

    try {
      const title = prompt.split('.').slice(0, 2).join('.') || "My New To-Do List";
      
      const response = await fetch('/api/createTasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate the list.');
      }

      const newTodoList: TodoList = await response.json();
      setTodoList(newTodoList);

    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-8 flex flex-col items-center gap-12">
      <MainTextArea onGenerate={handleGenerateList} isLoading={isLoading} />
      
      {error && <p className="text-red-500 mt-4">{error}</p>}
      
      {todoList && <TodoResult todoList={todoList} />}
    </main>
  );
}