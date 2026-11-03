import type { Request, Response } from 'express';
import type {
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from '../schemas/task.schemas.js';
import * as tasksService from '../services/tasks.service.js';

// Controllers only translate HTTP <-> service calls. Bodies are already validated
// by the validate() middleware, and thrown errors go to the error handler.

export async function listTasks(_req: Request, res: Response) {
  res.json(await tasksService.listTasks());
}

export async function createTask(req: Request<object, unknown, CreateTaskInput>, res: Response) {
  const { task, created } = await tasksService.createTask(req.body);
  res.status(created ? 201 : 200).json(task);
}

export async function updateTask(
  req: Request<{ id: string }, unknown, UpdateTaskInput>,
  res: Response,
) {
  res.json(await tasksService.updateTask(req.params.id, req.body));
}

// Responds with { task, rebalanced }. rebalanced: true tells the client that other
// cards in the column were renumbered, so it should refetch.
export async function moveTask(req: Request<{ id: string }, unknown, MoveTaskInput>, res: Response) {
  res.json(await tasksService.moveTask(req.params.id, req.body));
}

export async function deleteTask(req: Request<{ id: string }>, res: Response) {
  await tasksService.deleteTask(req.params.id);
  res.status(204).end();
}
