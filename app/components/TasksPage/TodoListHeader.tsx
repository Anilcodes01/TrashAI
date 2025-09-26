"use client";

import { useState, FC} from "react";
import { TodoList } from "@/app/types";
import { SharePopover } from "../main/ShareProvider";
import { Avatar } from "../ui/avatar";

interface TodoListHeaderProps {
  list: TodoList;
  isOwner: boolean;
}

export const TodoListHeader: FC<TodoListHeaderProps> = ({ list, isOwner }) => {
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const participants = [list.owner, ...list.collaborators.map((c) => c.user)];

  return (
    <div className="w-full flex justify-between items-center">
      <h1 className="text-sm">{list.title}</h1>
      <div className="relative flex gap-4 items-center lg:mr-8">
        <p className="text-zinc-600 text-sm">Edited just now</p>

        {participants.length > 1 && (
          <div className="flex items-center">
            {participants.map((participant, index) => (
              <div key={participant.id} className={index > 0 ? "-ml-2" : ""}>
                <Avatar name={participant.name || participant.username} />
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            <button
              onClick={() => setIsSharePopoverOpen((prev) => !prev)}
              className="text-sm cursor-pointer hover:text-zinc-600"
            >
              Share
            </button>
            {isSharePopoverOpen && (
              <SharePopover
                listId={list.id}
                onClose={() => setIsSharePopoverOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};