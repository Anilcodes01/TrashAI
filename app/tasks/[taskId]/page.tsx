"use client";

import { use } from 'react'; 
import TodoListDisplay from '@/app/components/TasksPage/TodoListDisplay';

export default function ListPage({ params }: { params: Promise<{ taskId: string }> }) {
  
  const resolvedParams = use(params);

  return (
    <div className="container mx-auto p-8">
      <TodoListDisplay taskId={resolvedParams.taskId} />
    </div>
  );
}