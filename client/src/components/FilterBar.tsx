import { useState } from 'react';
import { isFiltering } from '../lib/filters.ts';
import { useUiStore } from '../store/uiStore.ts';
import { COLUMNS, PRIORITIES, PRIORITY_LABELS } from '../types.ts';
import { Chip } from './Chip.tsx';
import { FilterSummary } from './FilterSummary.tsx';
import { SearchInput } from './SearchInput.tsx';

// Search + multi-select chips. Within a group chips are OR, across groups AND.
export function FilterBar() {
  const filters = useUiStore((state) => state.filters);
  const { togglePriority, toggleColumn, clearFilters } = useUiStore.getState();
  // Changing the key remounts SearchInput, which is the simplest way to empty its text.
  const [searchKey, setSearchKey] = useState(0);

  function handleClearAll() {
    clearFilters();
    setSearchKey((key) => key + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-4 py-3 sm:px-6">
      <SearchInput key={searchKey} />

      <div role="group" aria-label="Filter by priority" className="flex items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted">Priority</span>
        {PRIORITIES.map((priority) => (
          <Chip key={priority} pressed={filters.priorities.includes(priority)} onClick={() => togglePriority(priority)}>
            {PRIORITY_LABELS[priority]}
          </Chip>
        ))}
      </div>

      <div role="group" aria-label="Filter by column" className="flex items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted">Column</span>
        {COLUMNS.map((column) => (
          <Chip key={column.id} pressed={filters.columns.includes(column.id)} onClick={() => toggleColumn(column.id)}>
            {column.title}
          </Chip>
        ))}
      </div>

      {isFiltering(filters) && (
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-panel focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          Clear all
        </button>
      )}

      <FilterSummary />
    </div>
  );
}
