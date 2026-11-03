import { Router } from 'express';
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  updateTask,
} from '../controllers/tasks.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from '../schemas/task.schemas.js';

export const tasksRouter = Router();

tasksRouter.get('/', listTasks);
tasksRouter.post('/', validate(createTaskSchema), createTask);
tasksRouter.patch('/:id', validate(updateTaskSchema), updateTask);
tasksRouter.patch('/:id/move', validate(moveTaskSchema), moveTask);
tasksRouter.delete('/:id', deleteTask);
