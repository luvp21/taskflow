import type { Priority, Task, TaskChanges } from '../types.ts';

// Same limits as server/src/schemas/task.schemas.ts. The server still validates;
// these give instant feedback without a round trip.
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const TAG_MAX_LENGTH = 30;
export const MAX_TAGS = 10;

export interface TaskFormValues {
  title: string;
  description: string;
  priority: Priority;
  tags: string; // comma-separated, as typed
}

export type TaskFormErrors = Partial<Record<'title' | 'description' | 'tags', string>>;

export function formValuesFrom(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    tags: task?.tags.join(', ') ?? '',
  };
}

// "frontend, , bug, frontend " -> ["frontend", "bug"]
export function parseTags(input: string): string[] {
  const tags = input.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [...new Set(tags)];
}

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const title = values.title.trim();
  const tags = parseTags(values.tags);

  if (title.length === 0) errors.title = 'Title is required';
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;

  if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  }

  if (tags.length > MAX_TAGS) errors.tags = `Use at most ${MAX_TAGS} tags`;
  else if (tags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
    errors.tags = `Each tag must be at most ${TAG_MAX_LENGTH} characters`;
  }

  return errors;
}

export function toTaskFields(values: TaskFormValues): Required<TaskChanges> {
  return {
    title: values.title.trim(),
    description: values.description,
    priority: values.priority,
    tags: parseTags(values.tags),
  };
}

// Only the fields that actually differ, so saving an untouched form sends nothing.
export function changedFields(task: Task, fields: Required<TaskChanges>): TaskChanges {
  const changes: TaskChanges = {};
  if (fields.title !== task.title) changes.title = fields.title;
  if (fields.description !== task.description) changes.description = fields.description;
  if (fields.priority !== task.priority) changes.priority = fields.priority;
  if (fields.tags.join(',') !== task.tags.join(',')) changes.tags = fields.tags;
  return changes;
}
