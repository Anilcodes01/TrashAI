"use client";

import { FC, useState, FormEvent, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR, { useSWRConfig } from "swr";
import { Task, SubTask, Comment, User } from "@/app/types";
import { X, Send, LoaderCircle } from "lucide-react";
import { Avatar } from "../ui/avatar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CommentPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  item: (Task | SubTask) & { itemType: "task" | "subtask"; listId: string } | null;
  anchorEl: HTMLElement | null; 
}

export const CommentPopover: FC<CommentPopoverProps> = ({ isOpen, onClose, item, anchorEl }) => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const [newComment, setNewComment] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const swrKey = item ? `/api/comments/${item.itemType}/${item.id}` : null;
  const { data: comments, error, isLoading } = useSWR<Comment[]>(swrKey, fetcher);

  useEffect(() => {
    if (anchorEl && popoverRef.current) {
      const popover = popoverRef.current;
      const rect = anchorEl.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth;
      const popoverHeight = popover.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const margin = 12; 

      popover.style.top = `${Math.min(rect.top, windowHeight - popoverHeight - margin)}px`;
      
      if (rect.right + popoverWidth + margin > windowWidth) {
        popover.style.left = `${rect.left - popoverWidth - margin}px`;
      } else {
        popover.style.left = `${rect.right + margin}px`;
      }
    }
  }, [anchorEl, isOpen, comments]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !item || !session?.user) return;

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      createdAt: new Date(),
      author: session.user as User,
    };

    mutate(swrKey!, (currentComments = []) => [...currentComments, optimisticComment], false);
    setNewComment("");

    await fetch(swrKey!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim(), listId: item.listId }),
    });

    mutate(swrKey!);
    mutate(`/api/tasks/${item.listId}`);
  };

  if (!isOpen || !item) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex flex-col w-[380px] h-auto max-h-[70vh] bg-zinc-800 rounded-lg shadow-xl"
    >
    

      <div className="flex-grow p-3 overflow-y-auto space-y-4">
        {isLoading && <LoaderCircle className="animate-spin mx-auto mt-8 text-zinc-400" />}
        {error && <p className="text-red-500 text-sm">Failed to load comments.</p>}
        {comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3 items-start">
            <Avatar name={comment.author.name || comment.author.username} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                 <p className="font-semibold text-sm text-zinc-100">{comment.author.name || comment.author.username}</p>
                 <p className="text-xs text-zinc-400">
                    {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                 </p>
              </div>
              <p className="text-zinc-300 text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3  ">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-md p-1.5">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-grow bg-transparent text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-500"
          />
          <button type="submit" className="text-zinc-400 cursor-pointer hover:text-white disabled:text-zinc-600" disabled={!newComment.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};