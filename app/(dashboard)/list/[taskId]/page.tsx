"use client";

import { use } from 'react';
import TodoListDisplay from '@/app/components/TasksPage/TodoListDisplay';
import Sidebar from '@/app/components/main/Sidebar';

export default function NewList({ params }: { params: Promise<{ taskId: string }> }) {
  const resolvedParams = use(params);

    return <div className="container  bg-zinc-900 mx-auto p-4">
          <TodoListDisplay taskId={resolvedParams.taskId} />
        </div>
}