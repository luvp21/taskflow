import type { ColumnId, Task, TaskChanges } from '../types.ts';
import { request } from './http.ts';

export interface CreateTaskInput extends Required<TaskChanges> {
  _id: string;
  columnId: ColumnId;
}

const taskPath = (id: string) => `/api/tasks/${encodeURIComponent(id)}`;

export function fetchTasks(): Promise<Task[]> {
  return request<Task[]>('/api/tasks');
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return request<Task>('/api/tasks', { method: 'POST', body: input });
}

export function updateTask(id: string, changes: TaskChanges, version: number): Promise<Task> {
  return request<Task>(taskPath(id), { method: 'PATCH', body: { ...changes, version } });
}

export function deleteTask(id: string): Promise<null> {
  return request<null>(taskPath(id), { method: 'DELETE' });
}
