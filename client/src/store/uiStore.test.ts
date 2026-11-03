import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore.ts';

const initialState = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initialState, true);
});

describe('toasts', () => {
  it('stacks toasts in order and dismisses one by id', () => {
    const { showToast } = useUiStore.getState();

    showToast('First');
    showToast('Second', 'info');
    const [first, second] = useUiStore.getState().toasts;
    useUiStore.getState().dismissToast(first.id);

    expect(second).toMatchObject({ message: 'Second', tone: 'info' });
    expect(useUiStore.getState().toasts).toEqual([second]);
  });
});

describe('filters', () => {
  it('toggles chips on and off and clears everything', () => {
    const { togglePriority, toggleColumn, setQuery } = useUiStore.getState();

    togglePriority('high');
    togglePriority('low');
    togglePriority('high');
    toggleColumn('done');
    setQuery('auth');

    expect(useUiStore.getState().filters).toEqual({ query: 'auth', priorities: ['low'], columns: ['done'] });

    useUiStore.getState().clearFilters();
    expect(useUiStore.getState().filters).toEqual({ query: '', priorities: [], columns: [] });
  });
});
