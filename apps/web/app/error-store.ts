import { create } from "zustand";

export interface AppError {
  id: string;
  message: string;
}

interface ErrorStore {
  errors: AppError[];
  addError: (message: string) => void;
  removeError: (id: string) => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  addError: (message) =>
    set((s) => ({
      errors: [...s.errors, { id: crypto.randomUUID(), message }],
    })),
  removeError: (id) =>
    set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),
}));