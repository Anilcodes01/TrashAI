
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

export interface User {
  id: string;
  name: string | null;
  username: string;
}

export interface Collaborator {
  user: User;
}

export interface TodoList {
  id: string;
  title: string;
  ownerId: string;
  owner: User;
  collaborators: Collaborator[];
  tasks: Task[];
}