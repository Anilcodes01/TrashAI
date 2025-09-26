import { FC, KeyboardEvent, RefObject } from "react";
import { Task, SubTask } from "@/app/types";
import { Check, Square, Trash2, MessageSquare, MessageSquarePlus } from "lucide-react";

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
  inputRef: RefObject<HTMLInputElement>;
  onDelete: () => void;
   onOpenComments: (event: React.MouseEvent) => void;
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
  onDelete,
  onOpenComments,
}) => {
  const CheckboxIcon = item.completed ? Check : Square;
  const iconSize = isSubTask ? 16 : 24;
  const textSize = isSubTask ? "text-sm" : "text-base font-bold";
  const iconColor = item.completed ? "text-green-500" : "text-gray-400";
  const commentCount = item._count?.comments || 0;

  return (
    <div className="flex items-center gap-3 flex-grow group">
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
        onClick={onOpenComments}
        className={`ml-2 flex items-center cursor-pointer gap-1 text-xs text-gray-500 hover:text-blue-600 transition-opacity ${
          commentCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title="Comments"
      >
        <MessageSquarePlus size={14} />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      <button
        onClick={onDelete}
        className="ml-2 opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        title="Delete item"
      >
        <Trash2 size={isSubTask ? 14 : 16} />
      </button>
    </div>
  );
};