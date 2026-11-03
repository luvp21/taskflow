import { create } from 'zustand';
import { loadChaos, saveChaos, type ChaosSettings } from '../lib/chaos.ts';
import { NO_FILTERS, type Filters } from '../lib/filters.ts';
import type { ColumnId, Priority } from '../types.ts';

export type ToastTone = 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface UiState {
  toasts: Toast[];
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  chaos: ChaosSettings;
  setChaos: (changes: Partial<ChaosSettings>) => void;
  filters: Filters;
  setQuery: (query: string) => void;
  togglePriority: (priority: Priority) => void;
  toggleColumn: (columnId: ColumnId) => void;
  clearFilters: () => void;
}

// Adds the value if missing, removes it if present. Returns a new array.
function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

// UI-only state that isn't board data. Toasts are pushed from outside React (the
// sync engine), chaos settings are read by the HTTP client, and filters are read by
// several components and by the drag logic, which is why they live in a store.
export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  showToast: (message, tone = 'error') =>
    set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), message, tone }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  chaos: loadChaos(),
  setChaos: (changes) =>
    set((state) => {
      const chaos = { ...state.chaos, ...changes };
      saveChaos(chaos);
      return { chaos };
    }),

  filters: NO_FILTERS,
  setQuery: (query) => set((state) => ({ filters: { ...state.filters, query } })),
  togglePriority: (priority) =>
    set((state) => ({ filters: { ...state.filters, priorities: toggle(state.filters.priorities, priority) } })),
  toggleColumn: (columnId) =>
    set((state) => ({ filters: { ...state.filters, columns: toggle(state.filters.columns, columnId) } })),
  clearFilters: () => set({ filters: NO_FILTERS }),
}));
