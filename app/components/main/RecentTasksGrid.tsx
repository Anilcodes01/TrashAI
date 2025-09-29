'use client';
import axios from 'axios';
import { useState, useEffect } from 'react';
import TodoListCard, { TodoListWithCount } from './TaskCard';
import { useSession } from 'next-auth/react';
import { Clock, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RecentTodoListsGrid() {
  const [lists, setLists] = useState<TodoListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const {data: session} = useSession();
   const [isCreating, setIsCreating] = useState(false); 
   const router = useRouter();


  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await axios.get('/api/tasks/recent');
        if (res.data) {
          setLists(res.data);
        } else {
          console.log('Failed to fetch recent to-do lists');
        }
      } catch (error) {
        console.log('Error occurred while fetching recent lists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, []);


   const handleCreateNewList = async () => {
    setIsCreating(true);
    try {
      // Call our new API endpoint to create a blank list
      const res = await axios.post('/api/todolists');
      const newList = res.data;

      if (newList && newList.id) {
        // Redirect to the new list's page. We add a query parameter
        // to tell the page it's a brand new list.
        router.push(`/list/${newList.id}?new=true`);
      }
    } catch (error) {
      console.error("Failed to create new list:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Loading recent lists...
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Lists</h2>
        <p className="text-zinc-400">You have no recent to-do lists. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center gap-16 lg:p-8">
      <h1 className='text-5xl font-bold'>
       Hello {session?.user.name} 👋
      </h1>
    <div className='gap-2 flex flex-col'>
        <div className='flex lg:ml-2 text-gray-600  items-center gap-'>
          <Clock size={14}/>
          <h2 className="text-sm  text-gray-600 mb- lg:ml-2">Recent To-Do Lists</h2>
        </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 lg:max-w-4xl w-full gap-6">
        {lists.map((list) => (
          <TodoListCard key={list.id} list={list} />
        ))}
      </div>
    </div>

    <div>
        <button
          onClick={handleCreateNewList}
          disabled={isCreating}
          className='border px-4 py-2 rounded-2xl cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-zinc-800 disabled:bg-zinc-800 disabled:cursor-not-allowed'
        >
          {isCreating ? (
            <>
              <LoaderCircle className="animate-spin mr-2" size={16} />
              Creating...
            </>
          ) : (
            'Create new List'
          )}
        </button>
      </div>
    </div>
  );
}