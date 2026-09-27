import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * localStorage has a small per-origin quota (~5 MB in Chrome/Safari). Rendered
 * images are multi-megabyte data URLs, so a persisted store write can throw
 * QuotaExceededError. zustand's persist middleware calls setItem synchronously
 * inside every `set`, which means a storage failure would abort the store
 * action that triggered it (e.g. completing a render). Persistence is a
 * best-effort cache, never a reason to fail the in-memory state transition.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('[STORE_PERSIST]', JSON.stringify({ status: 'skipped', store: name, bytes: value.length, error: error instanceof Error ? error.name : String(error) }));
      try {
        localStorage.removeItem(name);
      } catch {
        /* storage unavailable */
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
};

export const createSafeJSONStorage = <S>() => createJSONStorage<S>(() => safeLocalStorage);

/** Inline images must never be persisted in localStorage; remote URLs are fine. */
export const persistableImageUrl = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' && value && !value.startsWith('data:') ? value : undefined;
