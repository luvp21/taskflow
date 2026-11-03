import type { ClientSession } from 'mongoose';
import { TaskModel, type ColumnId, type Task } from '../models/Task.js';

// Spacing between cards when there's room. Large enough that many drops can land
// between two cards before the gap gets too small.
export const ORDER_GAP = 1000;

// Below this gap, halving again loses floating-point precision, so the column is
// renumbered instead.
export const MIN_GAP = 1e-6;

// Fractional position for a card placed between `prev` and `next` (null = no card
// on that side). Only the moved card's orderIndex changes; neighbors stay put.
export function computeOrderIndex(prev: number | null, next: number | null): number {
  if (prev !== null && next !== null) return (prev + next) / 2;
  if (prev !== null) return prev + ORDER_GAP;
  if (next !== null) return next - ORDER_GAP;
  return ORDER_GAP;
}

export function needsRebalance(prev: number | null, next: number | null): boolean {
  return prev !== null && next !== null && next - prev < MIN_GAP;
}

export interface Neighbors {
  prev: Task | null;
  next: Task | null;
}

interface Placement {
  movingId: string;
  columnId: ColumnId;
  beforeId: string | null;
  afterId: string | null;
}

type Session = ClientSession | null;

// A neighbor only counts if it still exists and is in the target column.
function findInColumn(id: string | null, { movingId, columnId }: Placement, session: Session) {
  if (id === null || id === movingId) return Promise.resolve(null);
  return TaskModel.findOne({ _id: id, columnId }).session(session).lean<Task>();
}

// Order is (orderIndex, _id), so "after" includes equal indexes with a larger _id.
function firstAfter(anchor: Task, movingId: string, session: Session) {
  return TaskModel.findOne({
    columnId: anchor.columnId,
    _id: { $ne: movingId },
    $or: [
      { orderIndex: { $gt: anchor.orderIndex } },
      { orderIndex: anchor.orderIndex, _id: { $gt: anchor._id } },
    ],
  })
    .sort({ orderIndex: 1, _id: 1 })
    .session(session)
    .lean<Task>();
}

function lastBefore(anchor: Task, movingId: string, session: Session) {
  return TaskModel.findOne({
    columnId: anchor.columnId,
    _id: { $ne: movingId },
    $or: [
      { orderIndex: { $lt: anchor.orderIndex } },
      { orderIndex: anchor.orderIndex, _id: { $lt: anchor._id } },
    ],
  })
    .sort({ orderIndex: -1, _id: -1 })
    .session(session)
    .lean<Task>();
}

function lastInColumn({ movingId, columnId }: Placement, session: Session) {
  return TaskModel.findOne({ columnId, _id: { $ne: movingId } })
    .sort({ orderIndex: -1, _id: -1 })
    .session(session)
    .lean<Task>();
}

// The client's view may be stale, so its neighbor ids are only hints. We anchor on
// the card that should be above (beforeId) and look up whatever is CURRENTLY below
// it; if that card is gone, we anchor on afterId instead; if both are gone, we
// append to the end. The result is always two adjacent cards in today's order.
export async function findNeighbors(placement: Placement, session: Session = null): Promise<Neighbors> {
  const prev = await findInColumn(placement.beforeId, placement, session);
  if (prev) return { prev, next: await firstAfter(prev, placement.movingId, session) };

  const next = await findInColumn(placement.afterId, placement, session);
  if (next) return { prev: await lastBefore(next, placement.movingId, session), next };

  return { prev: await lastInColumn(placement, session), next: null };
}

// Renumbers a column 1000, 2000, ... keeping its order. Only orderIndex changes:
// version and updatedAt are left alone, because a renumber is not a user edit and
// must not make other clients' pending writes fail with 409.
export async function rebalanceColumn(columnId: ColumnId, movingId: string, session: ClientSession) {
  const tasks = await TaskModel.find({ columnId, _id: { $ne: movingId } })
    .sort({ orderIndex: 1, _id: 1 })
    .select('_id')
    .session(session)
    .lean<Pick<Task, '_id'>[]>();
  if (tasks.length === 0) return;

  await TaskModel.bulkWrite(
    tasks.map((task, i) => ({
      updateOne: {
        filter: { _id: task._id },
        update: { $set: { orderIndex: (i + 1) * ORDER_GAP } },
      },
    })),
    { session, timestamps: false },
  );
}
