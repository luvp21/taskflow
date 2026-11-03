import { create } from 'zustand';

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
}

// UI-only state that isn't board data. Toasts are pushed from outside React (the
// sync engine), which is why they live in a store and not in component state.
export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  showToast: (message, tone = 'error') =>
    set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), message, tone }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
