import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { ColumnId, Task } from '../src/models/Task.js';

export const api = () => request(createApp());

interface NewTask {
  _id?: string;
  title?: string;
  columnId?: ColumnId;
  orderIndex?: number;
}

export function taskBody(overrides: NewTask = {}) {
  return {
    _id: randomUUID(),
    title: 'Write tests',
    columnId: 'todo' as ColumnId,
    ...overrides,
  };
}

export async function createTask(overrides: NewTask = {}): Promise<Task> {
  const res = await api().post('/api/tasks').send(taskBody(overrides));
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.body as Task;
}
