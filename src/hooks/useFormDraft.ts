import { useState, useEffect, useCallback, useRef } from "react";

interface UseFormDraftOptions<T> {
  /** Unique key for this draft (e.g. "new-attendance", "goal-planner") */
  key: string;
  /** Initial/default form values */
  initialValues: T;
  /** Autosave interval in ms (default 5000) */
  autosaveInterval?: number;
  /** User ID for scoping drafts */
  userId?: string;
}

interface UseFormDraftReturn<T> {
  /** Current form values */
  values: T;
  /** Update form values */
  setValues: (v: T | ((prev: T) => T)) => void;
  /** Whether form has unsaved changes vs initial */
  isDirty: boolean;
  /** Whether a draft was recovered on mount */
  wasRecovered: boolean;
  /** Dismiss recovered state */
  dismissRecovery: () => void;
  /** Discard draft and reset to initial */
  discardDraft: () => void;
  /** Clear draft from storage (call after successful save) */
  clearDraft: () => void;
  /** Last autosave timestamp */
  lastSaved: Date | null;
  /** Whether currently saving */
  isSaving: boolean;
}

function getDraftKey(key: string, userId?: string): string {
  return `vm_draft_${key}${userId ? `_${userId}` : ""}`;
}

/**
 * Try to read draft from localStorage, checking both user-scoped and unscoped keys.
 * This handles the case where userId was undefined when draft was saved.
 */
function readDraft<T>(key: string, userId?: string): { data: T; foundKey: string } | null {
  const userKey = getDraftKey(key, userId);
  const bareKey = getDraftKey(key);

  // Prefer user-scoped key
  for (const k of [userKey, bareKey]) {
    try {
      const stored = localStorage.getItem(k);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data && typeof parsed.data === "object") {
          return { data: parsed.data as T, foundKey: k };
        }
      }
    } catch {
      try { localStorage.removeItem(k); } catch {}
    }
  }
  return null;
}

export function useFormDraft<T>({
  key,
  initialValues,
  autosaveInterval = 5000,
  userId,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const storageKey = getDraftKey(key, userId);
  const initialRef = useRef(initialValues);

  // Try to load draft on mount (check both keyed and unkeyed)
  const [values, setValues] = useState<T>(() => {
    const result = readDraft<T>(key, userId);
    if (result) {
      const merged = { ...initialValues, ...result.data };
      console.log("[useFormDraft] draft loaded from", result.foundKey, merged);
      // Migrate: if found under bare key but we have userId, move it
      if (userId && result.foundKey !== storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ data: merged, savedAt: new Date().toISOString() }));
          localStorage.removeItem(result.foundKey);
          console.log("[useFormDraft] migrated draft from", result.foundKey, "to", storageKey);
        } catch {}
      }
      return merged as T;
    }
    return initialValues;
  });

  const [wasRecovered, setWasRecovered] = useState(() => {
    return readDraft<T>(key, userId) !== null;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialRef.current);

  // Single autosave effect: saves on timer AND on cleanup (unmount/tab switch)
  useEffect(() => {
    if (!isDirty) return;

    const payload = JSON.stringify({ data: values, savedAt: new Date().toISOString() });

    const timer = window.setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(storageKey, payload);
        setLastSaved(new Date());
        console.log("[useFormDraft] draft saved (timer)", storageKey);
      } catch {}
      setIsSaving(false);
    }, autosaveInterval);

    return () => {
      clearTimeout(timer);
      // Save synchronously on cleanup (component unmount, tab switch, values change)
      try {
        localStorage.setItem(storageKey, payload);
        console.log("[useFormDraft] draft saved (cleanup)", storageKey);
      } catch {}
    };
  }, [values, isDirty, storageKey, autosaveInterval]);

  // Save immediately on critical changes (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ data: values, savedAt: new Date().toISOString() })
          );
        } catch {}
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, values, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    // Also clean bare key just in case
    const bareKey = getDraftKey(key);
    if (bareKey !== storageKey) {
      localStorage.removeItem(bareKey);
    }
    setLastSaved(null);
    console.log("[useFormDraft] draft cleared", storageKey);
  }, [storageKey, key]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    const bareKey = getDraftKey(key);
    if (bareKey !== storageKey) {
      localStorage.removeItem(bareKey);
    }
    setValues(initialRef.current);
    setWasRecovered(false);
    setLastSaved(null);
    console.log("[useFormDraft] draft discarded", storageKey);
  }, [storageKey, key]);

  const dismissRecovery = useCallback(() => {
    setWasRecovered(false);
  }, []);

  return {
    values,
    setValues,
    isDirty,
    wasRecovered,
    dismissRecovery,
    discardDraft,
    clearDraft,
    lastSaved,
    isSaving,
  };
}
