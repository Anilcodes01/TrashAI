// app/components/todo/AICommandModal.tsx
"use client";

import { FC, useState, FormEvent, useEffect, useRef } from 'react';
import { Sparkles, LoaderCircle, Send } from 'lucide-react';

interface AICommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (prompt: string) => Promise<void>;
}

export const AICommandModal: FC<AICommandModalProps> = ({ isOpen, onClose, onExecute }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className=" inset-0 bg-opacity-50 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div 
        className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()} 
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <Sparkles className="text-zinc-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell AI what to do... e.g., 'Add a task to buy bread'"
            className="flex-grow bg-transparent text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-500"
            disabled={isLoading}
          />
          {isLoading ? (
            <LoaderCircle className="animate-spin text-zinc-400" size={20} />
          ) : (
            <button type="submit" className="text-zinc-400 hover:text-white disabled:text-zinc-600" disabled={!prompt.trim()}>
              <Send size={20} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};