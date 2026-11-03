import { describe, expect, it } from 'vitest';
import type { Task } from '../types.ts';
import { mergeFetched } from './mergeTasks.ts';

const task = (id: string, version: number, orderIndex = 1000): Task => ({
  _id: id,
  title: id,
  description: '',
  priority: 'medium',
  columnId: 'todo',
  orderIndex,
  tags: [],
  version,
  createdAt: '',
  updatedAt: '',
});

describe('mergeFetched', () => {
  it('takes the fetched copy, including rebalanced indexes with the same version', () => {
    const merged = mergeFetched({ a: task('a', 2, 1000.0000001) }, [task('a', 2, 2000)]);

    expect(merged.a.orderIndex).toBe(2000);
  });

  it('keeps our copy when it has a higher version than the fetched one', () => {
    const mine = task('a', 5);

    expect(mergeFetched({ a: mine }, [task('a', 4)]).a).toBe(mine);
  });

  it('drops cards the server no longer has', () => {
    expect(mergeFetched({ gone: task('gone', 1) }, [task('a', 0)])).toEqual({ a: task('a', 0) });
  });
});
