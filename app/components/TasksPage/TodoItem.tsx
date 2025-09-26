
"use client";

import {FC, KeyboardEvent } from "react";
import {Task, SubTask, User } from "@/app/types";
import {
  Check,
  Square,
  Trash2,
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
  onDelete: () => void;
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
  onDelete, // Destructure the new prop
}) => {
  const CheckboxIcon = item.completed ? Check : Square;
  const iconSize = isSubTask ? 16 : 24;
  const textSize = isSubTask ? "text-sm" : "text-base font-bold";
  const iconColor = item.completed ? "text-green-500" : "text-gray-400";

  return (
    <div className="flex items-center gap-3 w-full group"> 
      <div className="cursor-pointer" onClick={onToggle}>
        <CheckboxIcon size={iconSize} className={iconColor} />
      </div>
      <div className="flex-grow"> 
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
      <button 
        onClick={onDelete}
        className="ml-auto opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        title="Delete item"
      >
        <Trash2 size={isSubTask ? 14 : 16} />
      </button>
    </div>
  );
};