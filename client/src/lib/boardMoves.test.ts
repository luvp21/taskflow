import { describe, expect, it } from 'vitest';
import type { BoardColumns } from '../types.ts';
import { moveInPreview, placementOf, samePlacement, stepPlacement } from './boardMoves.ts';

const board: BoardColumns = { todo: ['a', 'b', 'c'], in_progress: ['d'], done: [] };

describe('placementOf', () => {
  it('returns the column and the neighbors above and below', () => {
    expect(placementOf(board, 'b')).toEqual({ columnId: 'todo', beforeId: 'a', afterId: 'c' });
    expect(placementOf(board, 'a')).toEqual({ columnId: 'todo', beforeId: null, afterId: 'b' });
    expect(placementOf(board, 'd')).toEqual({ columnId: 'in_progress', beforeId: null, afterId: null });
  });

  it('returns null for an unknown card', () => {
    expect(placementOf(board, 'zzz')).toBeNull();
  });
});

describe('moveInPreview', () => {
  it('reorders down and up within a column', () => {
    expect(moveInPreview(board, 'a', 'c').todo).toEqual(['b', 'c', 'a']);
    expect(moveInPreview(board, 'c', 'a').todo).toEqual(['c', 'a', 'b']);
  });

  it('moves into another column before the card it is over', () => {
    const next = moveInPreview(board, 'b', 'd');

    expect(next.todo).toEqual(['a', 'c']);
    expect(next.in_progress).toEqual(['b', 'd']);
  });

  it('appends when dropped on a column instead of a card', () => {
    expect(moveInPreview(board, 'a', 'done').done).toEqual(['a']);
    expect(moveInPreview(board, 'a', 'todo').todo).toEqual(['b', 'c', 'a']);
  });

  it('never mutates the input', () => {
    const before = structuredClone(board);
    moveInPreview(board, 'b', 'd');
    expect(board).toEqual(before);
  });
});

describe('samePlacement', () => {
  it('compares column and both neighbors', () => {
    const p = { columnId: 'todo' as const, beforeId: 'a', afterId: null };
    expect(samePlacement(p, { ...p })).toBe(true);
    expect(samePlacement(p, { ...p, afterId: 'c' })).toBe(false);
  });
});

describe('stepPlacement', () => {
  it('moves up and down between the right neighbors', () => {
    expect(stepPlacement(board, 'c', 'up')).toEqual({ columnId: 'todo', beforeId: 'a', afterId: 'b' });
    expect(stepPlacement(board, 'a', 'down')).toEqual({ columnId: 'todo', beforeId: 'b', afterId: 'c' });
  });

  it('keeps the same row when moving to the next column, or goes to the end', () => {
    expect(stepPlacement(board, 'a', 'right')).toEqual({ columnId: 'in_progress', beforeId: null, afterId: 'd' });
    expect(stepPlacement(board, 'c', 'right')).toEqual({ columnId: 'in_progress', beforeId: 'd', afterId: null });
  });

  it('returns null at the edges', () => {
    expect(stepPlacement(board, 'a', 'up')).toBeNull();
    expect(stepPlacement(board, 'c', 'down')).toBeNull();
    expect(stepPlacement(board, 'a', 'left')).toBeNull();
    expect(stepPlacement(board, 'd', 'right')).toEqual({ columnId: 'done', beforeId: null, afterId: null });
  });
});
