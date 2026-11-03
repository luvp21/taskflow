import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isFiltering, visibleColumnIds, visibleColumns, visibleIdsIn } from '../lib/filters.ts';
import { useBoardStore } from '../store/boardStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import type { ColumnId } from '../types.ts';

// Everything here is DERIVED from the board view + the filters on each render.
// Filtering never writes to the board store, so it can't affect syncing.

// One column's visible ids. useShallow compares the ids, so the column re-renders
// only when its own visible list changes.
export function useVisibleTaskIds(columnId: ColumnId): string[] {
  const filters = useUiStore((state) => state.filters);
  return useBoardStore(useShallow((state) => visibleIdsIn(state.view, columnId, filters)));
}

export function useVisibleColumnIds(): ColumnId[] {
  const filters = useUiStore((state) => state.filters);
  return useMemo(() => visibleColumnIds(filters), [filters]);
}

export function useIsFiltering(): boolean {
  return useUiStore((state) => isFiltering(state.filters));
}

// Numbers for "Showing 4 of 15 cards".
export function useFilterSummary(): { shown: number; total: number } {
  const filters = useUiStore((state) => state.filters);
  return useBoardStore(
    useShallow((state) => ({
      shown: Object.values(visibleColumns(state.view, filters)).reduce((sum, ids) => sum + ids.length, 0),
      total: Object.keys(state.view.tasksById).length,
    })),
  );
}
