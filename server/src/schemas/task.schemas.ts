import { z } from 'zod';
import { COLUMN_IDS, PRIORITIES } from '../models/Task.js';

const title = z.string().trim().min(1).max(120);
const description = z.string().max(2000);
const priority = z.enum(PRIORITIES);
const columnId = z.enum(COLUMN_IDS);
const tags = z.array(z.string().trim().min(1).max(30)).max(10);
const version = z.number().int().min(0);

export const createTaskSchema = z.object({
  _id: z.uuid(),
  title,
  description: description.default(''),
  priority: priority.default('medium'),
  columnId,
  orderIndex: z.number().optional(),
  tags: tags.default([]),
});

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    priority: priority.optional(),
    tags: tags.optional(),
    version,
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.description !== undefined ||
      body.priority !== undefined ||
      body.tags !== undefined,
    { message: 'Provide at least one field to update' },
  );

// beforeId: the card that should end up directly above the moved card (null = top).
// afterId: the card that should end up directly below it (null = bottom).
export const moveTaskSchema = z.object({
  columnId,
  beforeId: z.string().min(1).nullable(),
  afterId: z.string().min(1).nullable(),
  version,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
