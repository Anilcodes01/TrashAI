
"use client";

import {FC, KeyboardEvent } from "react";
import {Task, SubTask, User } from "@/app/types";
import {
  Check,
  Square,
} from "lucide-react";

interface TodoItemProps {
  item: Task | SubTask;
  isSubTask: boolean;
  isEditing: boolean;
  editText: string;
  onToggle: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onTextChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export const TodoItem: FC<TodoItemProps> = ({
  item,
  isSubTask,
  isEditing,
  editText,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onKeyDown,
  onTextChange,
  inputRef,
}) => {
  const CheckboxIcon = item.completed ? Check : Square;
  const iconSize = isSubTask ? 16 : 24;
  const textSize = isSubTask ? "text-sm" : "text-base font-bold";
  const iconColor = item.completed ? "text-green-500" : "text-gray-400";

  return (
    <div className="flex items-center gap-3">
      <div className="cursor-pointer" onClick={onToggle}>
        <CheckboxIcon size={iconSize} className={iconColor} />
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={onKeyDown}
          className={`${textSize} bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500 w-full`}
        />
      ) : (
        <span
          onClick={onStartEdit}
          className={`${textSize} cursor-pointer ${
            item.completed ? "line-through text-gray-500" : ""
          }`}
        >
          {item.content}
        </span>
      )}
    </div>
  );
};