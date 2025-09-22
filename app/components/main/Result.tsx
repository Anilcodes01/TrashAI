
import { TodoList, } from '@/app/types';

interface TodoResultProps {
  todoList: TodoList;
}

const Checkbox = ({ id, content, completed }: { id: string, content: string, completed: boolean }) => (
  <div className="flex items-center gap-3">
    <input 
      id={id} 
      type="checkbox" 
      defaultChecked={completed} 
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
    <label htmlFor={id} className="text-base cursor-pointer">
      {content}
    </label>
  </div>
);

export default function TodoResult({ todoList }: TodoResultProps) {
  return (
    <div className="flex flex-col gap-8 items-start w-full lg:max-w-4xl">
      <div className="border-t border-gray-200 w-full"></div>
      
      <div className="w-full">
      </div>

      <div className="w-full space-y-6">
        {todoList.tasks.map((task) => (
          <div key={task.id} className="p-4 border rounded-lg b shadow-sm">
            <Checkbox id={task.id} content={task.content} completed={task.completed} />
            
            {task.subTasks && task.subTasks.length > 0 && (
              <div className="mt-3 pl-8 space-y-2">
                {task.subTasks.map((subTask) => (
                  <Checkbox 
                    key={subTask.id} 
                    id={subTask.id} 
                    content={subTask.content} 
                    completed={subTask.completed} 
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}