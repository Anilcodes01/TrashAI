
export interface SubTask {
  id: string;
  content: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  order: number;
  subTasks: SubTask[];
}

export interface TodoList {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
}