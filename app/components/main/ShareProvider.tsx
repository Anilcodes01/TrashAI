
"use client";

import { useState, useEffect, useCallback } from 'react';
import { LoaderCircle, X, Send } from 'lucide-react';
import { inviteUserToList } from '@/app/actions/todoListActions';
import debounce from 'lodash.debounce';

type UserSuggestion = {
  id: string;
  name: string | null;
  username: string;
  email: string;
};

export function SharePopover({ listId, onClose }: { listId: string, onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${query}&listId=${listId}`);
      if (!response.ok) throw new Error('Failed to fetch users.');
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError('Could not load suggestions.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(debounce(fetchSuggestions, 300), [listId]);

  useEffect(() => {
    debouncedFetch(searchQuery);
  }, [searchQuery, debouncedFetch]);

  const handleInvite = async (userId: string) => {
    setIsInviting(true);
    setError(null);
    try {
      const result = await inviteUserToList(listId, userId);
      alert(result.message); // Replace with a toast notification
      setSearchQuery('');
      setSuggestions([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="absolute top-10 right-0 lg:right-8 w-72 bg-zinc-900 border border-gray-700 rounded-lg shadow-xl p-4 z-10">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Share with others</h3>
        <button onClick={onClose} className="text-gray-400 cursor-pointer hover:text-white">
          <X size={20} />
        </button>
      </div>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Email, name, or username"
          className="w-full bg-zinc-800 border border-gray-600 rounded-md px-3 py-2 text-sm "
        />
        {isLoading && <LoaderCircle className="absolute right-2 top-2.5 animate-spin text-gray-500" size={16}/>}
      </div>

      {suggestions.length > 0 && (
        <ul className="mt-2 border-t border-gray-700 pt-2">
          {suggestions.map((user) => (
            <li key={user.id} className="flex justify-between items-center p-2 rounded-md hover:bg-zinc-900 bg-zinc-800">
              <div>
                <p className="text-sm font-medium">{user.name || user.username}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <button
                onClick={() => handleInvite(user.id)}
                disabled={isInviting}
                className="p-1.5 rounded-md cursor-pointer text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-50"
              >
                {isInviting ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16}/>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}