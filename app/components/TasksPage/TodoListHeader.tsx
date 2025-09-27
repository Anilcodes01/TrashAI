"use client";

import { useState, FC } from "react";
import { TodoList } from "@/app/types";
import { SharePopover } from "../main/ShareProvider";
import { Avatar } from "../ui/avatar";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { Tooltip } from "./ToolTip";

interface TodoListHeaderProps {
  list: TodoList;
  isOwner: boolean;
}

export const TodoListHeader: FC<TodoListHeaderProps> = ({ list, isOwner }) => {
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const participants = [list.owner, ...list.collaborators.map((c) => c.user)];

  const getFormattedUpdateDate = () => {
    if (!list.updatedAt) {
      return "Edited just now";
    }

    const updatedAtDate = new Date(list.updatedAt);
    const now = new Date();
    const hoursDifference = differenceInHours(now, updatedAtDate);

    if (hoursDifference < 24) {
      return `Edited ${formatDistanceToNow(updatedAtDate, {
        addSuffix: true,
      })}`;
    } else {
      return `Edited on ${format(updatedAtDate, "MMMM d, yyyy")}`;
    }
  };

  const lastUpdatedText = getFormattedUpdateDate();
  const createdDateText = list.createdAt
    ? `Created on ${format(new Date(list.createdAt), "MMMM d, yyyy")}`
    : "";

  return (
    <div className="w-full flex justify-between items-center">
      <h1 className="text-sm">{list.title}</h1>
      <div className="relative flex gap-4 items-center lg:mr-8">
        <Tooltip text={createdDateText}>
          <p className="text-zinc-600 text-sm cursor-default">
            {lastUpdatedText}
          </p>
        </Tooltip>

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
