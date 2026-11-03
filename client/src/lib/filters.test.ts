import { describe, expect, it } from 'vitest';
import type { BoardView, Task } from '../types.ts';
import { findMatch, isFiltering, matchesFilters, NO_FILTERS, visibleColumnIds, visibleColumns } from './filters.ts';

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    _id: id,
    title: id,
    description: '',
    priority: 'medium',
    columnId: 'todo',
    orderIndex: 1000,
    tags: [],
    version: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const auth = task('auth', { title: 'Set up Auth', priority: 'high' });
const docs = task('docs', { title: 'Write docs', description: 'Explain the AUTH flow', priority: 'low' });
const font = task('font', { title: 'Pick a font', priority: 'medium', columnId: 'done' });
const view: BoardView = {
  tasksById: { auth, docs, font },
  columns: { todo: ['auth', 'docs'], in_progress: [], done: ['font'] },
};

describe('matchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect([auth, docs, font].every((t) => matchesFilters(t, NO_FILTERS))).toBe(true);
  });

  it('searches title and description, case-insensitively', () => {
    const filters = { ...NO_FILTERS, query: '  auth ' };

    expect(matchesFilters(auth, filters)).toBe(true); // title
    expect(matchesFilters(docs, filters)).toBe(true); // description
    expect(matchesFilters(font, filters)).toBe(false);
  });

  it('ORs chips within the priority group', () => {
    const filters = { ...NO_FILTERS, priorities: ['high' as const, 'low' as const] };

    expect([auth, docs, font].map((t) => matchesFilters(t, filters))).toEqual([true, true, false]);
  });

  it('ANDs across groups: priority AND text', () => {
    const filters = { ...NO_FILTERS, query: 'auth', priorities: ['low' as const] };

    expect([auth, docs, font].map((t) => matchesFilters(t, filters))).toEqual([false, true, false]);
  });
});

describe('visibleColumns', () => {
  it('hides whole columns that are not selected, and ANDs with the other filters', () => {
    const filters = { query: 'a', priorities: ['high' as const, 'medium' as const], columns: ['todo' as const] };

    expect(visibleColumnIds(filters)).toEqual(['todo']);
    expect(visibleColumns(view, filters)).toEqual({ todo: ['auth'], in_progress: [], done: [] });
  });

  it('keeps the board order of columns and cards', () => {
    expect(visibleColumnIds({ ...NO_FILTERS, columns: ['done', 'todo'] })).toEqual(['todo', 'done']);
    expect(visibleColumns(view, NO_FILTERS)).toEqual(view.columns);
  });

  it('never changes the view it filters', () => {
    const before = structuredClone(view);
    visibleColumns(view, { query: 'x', priorities: ['low'], columns: ['done'] });
    expect(view).toEqual(before);
  });
});

describe('isFiltering and findMatch', () => {
  it('ignores a query that is only spaces', () => {
    expect(isFiltering({ ...NO_FILTERS, query: '   ' })).toBe(false);
    expect(isFiltering({ ...NO_FILTERS, priorities: ['low'] })).toBe(true);
  });

  it('finds the matched range case-insensitively', () => {
    expect(findMatch('Set up Auth', 'AUTH')).toEqual({ start: 7, end: 11 });
    expect(findMatch('Set up Auth', 'zzz')).toBeNull();
    expect(findMatch('Set up Auth', '')).toBeNull();
  });
});
