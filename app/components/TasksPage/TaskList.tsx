"use client";

import { FC, KeyboardEvent } from "react";
import { Task, SubTask } from "@/app/types";
import { NewItemInput } from "./NewItemInput";
import { TodoItem } from "./TodoItem";
import { CornerDownRight, PlusCircle } from "lucide-react"; // Import PlusCircle

interface TaskListProps {
  tasks: Task[];
  editingItemId: string | null;
  editText: string;
  handleToggle: (itemId: string, isSubTask: boolean) => void;
  startEditing: (item: Task | SubTask) => void;
  handleSaveEdit: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  setEditText: (value: string) => void;
 handleDelete: (itemId: string, itemType: 'task' | 'subtask') => void; 
  inputRef: React.RefObject<HTMLInputElement | null>; 
  addingItem: { type: "task" | "subtask"; parentId?: string } | null;
  onStartAddTask: () => void;
  onStartAddSubTask: (parentId: string) => void;
  onSaveNewItem: (content: string) => void;
  onCancelAdd: () => void;
}

export const TaskList: FC<TaskListProps> = ({ 
  tasks, 
  addingItem, 
  onStartAddTask, 
  onStartAddSubTask, 
  onSaveNewItem, 
  onCancelAdd, 
  handleDelete,
  ...props 
}) => {
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id} className="p-4 max-w-4xl w-full rounded-lg group"> {/* Added 'group' for hover effect */}
          
          {/* Main Task Item Row */}
          <div className="flex justify-between items-center">
            <TodoItem
              item={task}
              isSubTask={false}
              isEditing={props.editingItemId === task.id}
              editText={props.editText}
              onToggle={() => props.handleToggle(task.id, false)}
              onStartEdit={() => props.startEditing(task)}
              onSaveEdit={props.handleSaveEdit}
              onKeyDown={props.handleKeyDown}
              onTextChange={props.setEditText}
              onDelete={() => handleDelete(task.id, 'task')}
              inputRef={props.inputRef as React.RefObject<HTMLInputElement>}
            />
            <button
                onClick={() => onStartAddSubTask(task.id)}
                className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity ml-4" // Show on parent hover
                title="Add sub-task"
            >
                <CornerDownRight size={18} className="text-gray-500 hover:text-green-500" />
            </button>
          </div>
          
          {/* Sub-tasks Section */}
          <div className="mt-3 pl-8 space-y-2">
            {task.subTasks?.map((subTask) => (
              <TodoItem
                key={subTask.id}
                item={subTask}
                isSubTask={true}
                isEditing={props.editingItemId === subTask.id}
                editText={props.editText}
                onToggle={() => props.handleToggle(subTask.id, true)}
                onStartEdit={() => props.startEditing(subTask)}
                onSaveEdit={props.handleSaveEdit}
                onKeyDown={props.handleKeyDown}
                onTextChange={props.setEditText}
                 onDelete={() => handleDelete(subTask.id, 'subtask')} 
                inputRef={props.inputRef as React.RefObject<HTMLInputElement>}
              />
            ))}
            
            {/* NEW: Input for adding a new sub-task */}
            {addingItem?.type === 'subtask' && addingItem.parentId === task.id && (
                <NewItemInput 
                    isSubTask={true}
                    placeholder="New sub-task..."
                    onSave={onSaveNewItem}
                    onCancel={onCancelAdd}
                />
            )}
          </div>
        </div>
      ))}

      {/* NEW: Input for adding a new main task */}
      {addingItem?.type === 'task' && (
         <div className="p-4 max-w-4xl w-full">
            <NewItemInput 
                isSubTask={false}
                placeholder="New task..."
                onSave={onSaveNewItem}
                onCancel={onCancelAdd}
            />
         </div>
      )}

      {/* NEW: Button to trigger adding a new main task */}
      {!addingItem && (
        <div className="p-4 max-w-4xl w-full">
            <button
              onClick={onStartAddTask}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors w-full"
            >
              <PlusCircle size={20} />
              <span className="font-semibold">Add task</span>
            </button>
        </div>
      )}
    </>
  );
};