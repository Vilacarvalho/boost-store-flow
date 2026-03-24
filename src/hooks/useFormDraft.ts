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
  const [wasRecovered, setWasRecovered] = useState(false);

  // Try to load draft on mount
  const [values, setValues] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data) {
          setWasRecovered(true);
          return parsed.data as T;
        }
      }
    } catch {}
    return initialValues;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialRef.current);

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
      } catch {}
      setIsSaving(false);
    }, autosaveInterval);

    return () => clearTimeout(timer);
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
