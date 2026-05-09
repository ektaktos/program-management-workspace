export interface Alert {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'Active' | 'Planning' | 'On Hold' | 'Completed';
  color: string;
  start?: string;
  end?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  phaseId?: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'inreview' | 'overdue' | 'done';
  priority: 'high' | 'medium' | 'low';
  due?: string;
  dueTime?: string;
  assignee?: string;
  alerts?: Alert[];
  recurring?: string;
  subtasks?: Subtask[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  desc: string;
  date?: string;
  status: 'upcoming' | 'done' | 'overdue';
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  notes: string;
  start?: string;
  end?: string;
  progress: number;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface PlannerEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  notes: string;
  done: boolean;
  createdAt: number;
  time?: string;
}

export interface PlannerAppointment {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  done: boolean;
  createdAt: number;
}

export interface PlannerWeekData {
  goals: { id: string; text: string; done: boolean }[];
  notes: string;
  focus: string;
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  phases: Phase[];
  notes: Note[];
  notifiedAlerts: string[];
}

export type TaskStatus = Task['status'];
export type ProjectStatus = Project['status'];
export type Priority = Task['priority'];
