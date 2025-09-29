"use client";

import { FC, KeyboardEvent, useState } from "react";
import { Task, SubTask } from "@/app/types";
import { NewItemInput } from "./NewItemInput";
import { TodoItem } from "./TodoItem";
import { CornerDownRight, PlusCircle } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  editingItemId: string | null;
  editText: string;
  handleToggle: (itemId: string, isSubTask: boolean) => void;
   startEditing: (item: Task | SubTask | null) => void;
  handleSaveEdit: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  setEditText: (value: string) => void;
  handleDelete: (itemId: string, itemType: "task" | "subtask") => void;
  onSaveNewItem: (content: string, type: "task" | "subtask", parentId?: string) => void;
  onOpenComments: (item: Task | SubTask, itemType: "task" | "subtask", event: React.MouseEvent) => void;
}


export const TaskList: FC<TaskListProps> = ({ 
  tasks, 
  onSaveNewItem, 
  handleDelete,
  onOpenComments,
  ...props 
}) => {

  const [addingItem, setAddingItem] = useState<{
    type: "task" | "subtask";
    parentId?: string;
  } | null>(null);


  const handleStartAddTask = () => {
    props.startEditing(null); 
    setAddingItem({ type: "task" });
  };

  const handleStartAddSubTask = (parentId: string) => {
    props.startEditing(null);
    setAddingItem({ type: "subtask", parentId });
  };

  const handleCancelAdd = () => {
    setAddingItem(null);
  };

  const handleSave = (content: string) => {
    if (!addingItem) return;
    // Call the original save function passed from the parent
    onSaveNewItem(content, addingItem.type, addingItem.parentId);
    setAddingItem(null); // Reset the state after saving
  };


  return (
    <>
      {tasks.map((task) => (
        <div key={task.id} className="px-4 py-2 max-w-4xl w-full rounded-lg ">
          
          <div className="flex justify-between items-center group">
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
              onOpenComments={(event) => onOpenComments(task, 'task', event)}
            />
            <button
                 onClick={() => handleStartAddSubTask(task.id)}
                className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity ml-4" 
                title="Add sub-task"
            >
                <CornerDownRight size={18} className="text-gray-500 hover:text-green-500" />
            </button>
          </div>
          
          <div className="mt-3 pl-8 space-y-1">
            {task.subTasks?.map((subTask) => (
              <TodoItem
                key={subTask.id}
                item={subTask}
                isSubTask={true}
                isEditing={props.editingItemId === subTask.id}
                editText={props.editText}
                onToggle={() => props.handleToggle(subTask.id, true)}
                onStartEdit={() => props.startEditing(subTask)}
                  onOpenComments={(event) => onOpenComments(subTask, 'subtask', event)}
                onSaveEdit={props.handleSaveEdit}
                onKeyDown={props.handleKeyDown}
                onTextChange={props.setEditText}
                 onDelete={() => handleDelete(subTask.id, 'subtask')} 
              />
            ))}
            
            {addingItem?.type === 'subtask' && addingItem.parentId === task.id && (
               <NewItemInput 
                    isSubTask={true}
                    placeholder="New sub-task..."
                    onSave={handleSave}
                    onCancel={handleCancelAdd}
                />
            )}
          </div>
        </div>
      ))}

      {addingItem?.type === 'task' && (
         <div className="p-4 max-w-4xl w-full">
           <NewItemInput 
                isSubTask={false}
                placeholder="New task..."
                onSave={handleSave}
                onCancel={handleCancelAdd}
            />
         </div>
      )}

      {!addingItem && (
        <div className="p-4 max-w-4xl w-full">
            <button
              onClick={handleStartAddTask}
              className="flex items-center cursor-pointer gap-2 text-gray-500 hover:text-gray-800 transition-colors w-full"
            >
              <PlusCircle size={20} />
              <span className="font-semibold">Add task</span>
            </button>
        </div>
      )}
    </>
  );
};