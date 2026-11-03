import mongoose, { type ClientSession } from 'mongoose';
import { TaskModel, type ColumnId, type Task } from '../models/Task.js';
import type {
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from '../schemas/task.schemas.js';
import { HttpError } from '../utils/HttpError.js';
import {
  computeOrderIndex,
  findNeighbors,
  needsRebalance,
  rebalanceColumn,
  type Neighbors,
} from './ordering.service.js';

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

// Version-guarded write of a card's new position.
async function applyMove(
  id: string,
  columnId: ColumnId,
  orderIndex: number,
  version: number,
  session: ClientSession | null = null,
): Promise<Task> {
  const task = await TaskModel.findOneAndUpdate(
    { _id: id, version },
    { $set: { columnId, orderIndex }, $inc: { version: 1 } },
    { returnDocument: 'after', session },
  ).lean<Task>();

  return task ?? throwNotFoundOrConflict(id);
}

function orderIndexBetween({ prev, next }: Neighbors): number {
  return computeOrderIndex(prev?.orderIndex ?? null, next?.orderIndex ?? null);
}

// Rare path: the gap between the neighbors is too small. Renumbering the column and
// placing the card must succeed or fail together, so both run in one transaction.
// withTransaction retries automatically on transient errors such as a write conflict
// with another rebalance; a 404/409 thrown inside aborts and rolls everything back.
async function moveWithRebalance(id: string, input: MoveTaskInput): Promise<Task> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      await rebalanceColumn(input.columnId, id, session);
      const neighbors = await findNeighbors({ movingId: id, ...input }, session);
      return applyMove(id, input.columnId, orderIndexBetween(neighbors), input.version, session);
    });
  } finally {
    await session.endSession();
  }
}

// The server, not the client, decides the final orderIndex, from the neighbors as
// they are NOW. The normal path is a single atomic findOneAndUpdate, no transaction.
export async function moveTask(
  id: string,
  input: MoveTaskInput,
): Promise<{ task: Task; rebalanced: boolean }> {
  const neighbors = await findNeighbors({ movingId: id, ...input });

  if (needsRebalance(neighbors.prev?.orderIndex ?? null, neighbors.next?.orderIndex ?? null)) {
    return { task: await moveWithRebalance(id, input), rebalanced: true };
  }

  const orderIndex = orderIndexBetween(neighbors);
  return { task: await applyMove(id, input.columnId, orderIndex, input.version), rebalanced: false };
}

export async function deleteTask(id: string): Promise<void> {
  const { deletedCount } = await TaskModel.deleteOne({ _id: id });
  if (deletedCount === 0) throw new HttpError(404, 'Task not found');
}
