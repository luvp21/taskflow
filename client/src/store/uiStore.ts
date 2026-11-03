import { create } from 'zustand';
import { loadChaos, saveChaos, type ChaosSettings } from '../lib/chaos.ts';

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
}

// UI-only state that isn't board data. Toasts are pushed from outside React (the
// sync engine) and chaos settings are read by the HTTP client, which is why both
// live in a store and not in component state.
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
}));
