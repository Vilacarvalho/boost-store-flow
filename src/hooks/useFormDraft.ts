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

export function useFormDraft<T>({
  key,
  initialValues,
  autosaveInterval = 5000,
  userId,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const storageKey = getDraftKey(key, userId);
  const initialRef = useRef(initialValues);
  // Try to load draft on mount
  const [values, setValues] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data && typeof parsed.data === "object") {
          // Merge with initial values to ensure all keys exist (handles schema changes)
          const merged = { ...initialValues, ...parsed.data };
          return merged as T;
        }
      }
    } catch {
      // Corrupted draft - remove it
      try { localStorage.removeItem(storageKey); } catch {}
    }
    return initialValues;
  });

  // Detect recovery separately (avoid calling setState inside useState initializer)
  const [wasRecovered, setWasRecovered] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return !!(parsed?.data && typeof parsed.data === "object");
      }
    } catch {}
    return false;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialRef.current);

  // Keep a ref to latest values for unmount save
  const valuesRef = useRef(values);
  const isDirtyRef = useRef(isDirty);
  const storageKeyRef = useRef(storageKey);
  useEffect(() => { valuesRef.current = values; }, [values]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { storageKeyRef.current = storageKey; }, [storageKey]);

  // Autosave
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ data: values, savedAt: new Date().toISOString() })
        );
        setLastSaved(new Date());
        console.log("[useFormDraft] draft saved", storageKey);
      } catch {}
      setIsSaving(false);
    }, autosaveInterval);

    return () => clearTimeout(timer);
  }, [values, isDirty, storageKey, autosaveInterval]);

  // Save immediately on unmount to prevent data loss (e.g. tab switch)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        try {
          localStorage.setItem(
            storageKeyRef.current,
            JSON.stringify({ data: valuesRef.current, savedAt: new Date().toISOString() })
          );
          console.log("[useFormDraft] draft saved on unmount", storageKeyRef.current);
        } catch {}
      }
    };
  }, []);

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
    setLastSaved(null);
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setValues(initialRef.current);
    setWasRecovered(false);
    setLastSaved(null);
  }, [storageKey]);

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
