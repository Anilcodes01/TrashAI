
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: User;
}


export type SubTask = {
  id: string;
  content: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
    _count?: {
    comments: number;
  };
};

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  order: number;
  subTasks: SubTask[];
   createdAt: Date;
  updatedAt: Date;
    _count?: {
    comments: number;
  };
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
  createdAt: string;
  updatedAt: string
}