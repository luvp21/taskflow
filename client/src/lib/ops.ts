import type { Op } from '../types.ts';

export function opTaskId(op: Op): string {
  return op.kind === 'create' ? op.task._id : op.taskId;
}

const VERBS: Record<Op['kind'], string> = {
  create: 'create',
  update: 'save',
  move: 'move',
  delete: 'delete',
};

export function failureMessage(op: Op, title: string): string {
  return `Couldn't ${VERBS[op.kind]} “${title}”. Reverted.`;
}
