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
