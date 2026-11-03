import mongoose from 'mongoose';
import { TaskModel, type ColumnId, type Task } from '../models/Task.js';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schemas.js';
import { HttpError } from '../utils/HttpError.js';
import { computeOrderIndex } from './ordering.service.js';

const DUPLICATE_KEY_ERROR = 11000;

export function listTasks(): Promise<Task[]> {
  // _id breaks orderIndex ties so every client renders the same order.
  return TaskModel.find().sort({ columnId: 1, orderIndex: 1, _id: 1 }).lean<Task[]>();
}

async function orderIndexAtEnd(columnId: ColumnId): Promise<number> {
  const last = await TaskModel.findOne({ columnId }).sort({ orderIndex: -1 }).lean<Task>();
  return computeOrderIndex(last?.orderIndex ?? null, null);
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR;
}

// Idempotent: the client picks the _id, so a retried or double-submitted create
// hits the unique _id index and gets the existing task back instead of a copy.
export async function createTask(
  input: CreateTaskInput,
): Promise<{ task: Task; created: boolean }> {
  const orderIndex = input.orderIndex ?? (await orderIndexAtEnd(input.columnId));

  try {
    const doc = await TaskModel.create({ ...input, orderIndex });
    return { task: doc.toObject(), created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const existing = await TaskModel.findById(input._id).lean<Task>();
    if (!existing) throw error;
    return { task: existing, created: false };
  }
}

// Called when a version-guarded write matched nothing: either the task is gone,
// or someone else wrote first and its version moved on.
export async function throwNotFoundOrConflict(id: string): Promise<never> {
  const current = await TaskModel.findById(id).lean<Task>();
  if (!current) throw new HttpError(404, 'Task not found');
  throw new HttpError(409, 'Task was changed by someone else', { task: current });
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const { version, ...fields } = input;

  // One atomic operation: match only if the version is unchanged, then set the
  // fields and bump the version. Two racing writers can't both match.
  const task = await TaskModel.findOneAndUpdate(
    { _id: id, version },
    { $set: fields, $inc: { version: 1 } },
    { returnDocument: 'after', runValidators: true },
  ).lean<Task>();

  return task ?? throwNotFoundOrConflict(id);
}

export async function deleteTask(id: string): Promise<void> {
  const { deletedCount } = await TaskModel.deleteOne({ _id: id });
  if (deletedCount === 0) throw new HttpError(404, 'Task not found');
}
