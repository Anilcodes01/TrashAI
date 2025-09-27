// app/components/todo/AICommandModal.tsx
"use client";

import { FC, useState, FormEvent, useEffect, useRef } from 'react';
import { Sparkles, LoaderCircle, Send, Plus } from 'lucide-react';

interface AICommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (prompt: string) => Promise<void>;
}

export const AICommandModal: FC<AICommandModalProps> = ({ isOpen, onClose, onExecute }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null); // Changed from HTMLInputElement

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    await onExecute(prompt.trim());
    setIsLoading(false);
    setPrompt('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="items-center  bg flex-col inset-0 bg-opacity-50 z-50 flex items- justify-center " onClick={onClose}>
      <div 
        className="bg-zinc-800 border border-zinc-700 rounded-2xl shadow-xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()} 
      >
        <form onSubmit={handleSubmit} className="flex flex-col  gap-2 p-3">
          {/* <Sparkles className="text-zinc-400" size={20} /> */}
          <textarea
            ref={inputRef}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell AI what to do... e.g., 'Add a task to buy bread'"
            className="flex-grow resize-none bg-transparent text-sm text-zinc-200 focus:outline-none  placeholder:text-zinc-500"
            disabled={isLoading}
          />
          <div className='flex  items-center  justify-between'>

            <div>
               <button className='cursor-pointer'>
                <Plus size={20}/>
               </button>
            </div>
           <div>
             {isLoading ? (
            <LoaderCircle className="animate-spin text-zinc-400" size={20} />
          ) : (
            <button type="submit" className="text-zinc-400  cursor-pointer h-full text-start hover:text-white disabled:text-zinc-600" disabled={!prompt.trim()}>
              <Send size={20} />
            </button>
          )}
           </div>
          </div>
        </form>
       
      </div>
      <div>
        <p className='text-sm mt-2'>TrashAI can make mistakes. Check important info. See cookie preferences.</p>
      </div>
    </div>
  );
};