import { describe, expect, it } from 'vitest';
import type { Task } from '../types.ts';
import { changedFields, parseTags, toTaskFields, validateTaskForm, type TaskFormValues } from './taskForm.ts';

const valid: TaskFormValues = { title: 'Set up auth', description: '', priority: 'high', tags: '' };

describe('parseTags', () => {
  it('splits on commas, trims, drops empties and duplicates', () => {
    expect(parseTags(' frontend, , bug,frontend ')).toEqual(['frontend', 'bug']);
  });
});

describe('validateTaskForm', () => {
  it('accepts a valid form', () => {
    expect(validateTaskForm(valid)).toEqual({});
  });

  it('requires a title that is not just spaces', () => {
    expect(validateTaskForm({ ...valid, title: '   ' }).title).toBe('Title is required');
  });

  it('enforces the same length limits as the server', () => {
    const errors = validateTaskForm({
      ...valid,
      title: 'x'.repeat(121),
      description: 'x'.repeat(2001),
      tags: 'y'.repeat(31),
    });

    expect(Object.keys(errors).sort()).toEqual(['description', 'tags', 'title']);
  });

  it('limits the number of tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`).join(',');

    expect(validateTaskForm({ ...valid, tags }).tags).toBe('Use at most 10 tags');
  });
});

describe('changedFields', () => {
  const task: Task = {
    _id: 'a',
    title: 'Set up auth',
    description: '',
    priority: 'high',
    columnId: 'todo',
    orderIndex: 1000,
    tags: ['backend'],
    version: 0,
    createdAt: '',
    updatedAt: '',
  };

  it('is empty when nothing changed', () => {
    expect(changedFields(task, toTaskFields({ ...valid, tags: 'backend' }))).toEqual({});
  });

  it('returns only the fields that differ', () => {
    const fields = toTaskFields({ ...valid, title: ' Renamed ', tags: 'backend, bug' });

    expect(changedFields(task, fields)).toEqual({ title: 'Renamed', tags: ['backend', 'bug'] });
  });
});
