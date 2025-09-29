import Link from 'next/link';

export type TodoListWithCount = {
  id: string;
  title: string;
  description: string | null;
  _count: {
    tasks: number;
  };
};

interface TodoListCardProps {
  list: TodoListWithCount;
}

export default function TodoListCard({ list }: TodoListCardProps) {
  return (
    <Link
      href={`/tasks/${list.id}`} 
      className="block bg-zinc-800 p-5 rounded-3xl shadow-md hover:bg-zinc-700 transition-all duration-200 group"
    >
      <h3 className="text-xl font-bold text-white truncate group-hover:text-green-400">
        {list.title}
      </h3>
      <p className="text-sm text-zinc-400 mt-2 h-10 overflow-hidden text-ellipsis">
        {list.description || 'No description provided.'}
      </p>
      <div className="mt-4 border-t border-zinc-700 pt-3">
        <span className="text-sm font-medium text-white">
          {list._count.tasks} {list._count.tasks === 1 ? 'Task' : 'Tasks'}
        </span>
      </div>
    </Link>
  );
}