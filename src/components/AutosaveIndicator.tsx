import { Check, Loader2 } from "lucide-react";

interface AutosaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  isDirty: boolean;
}

export function AutosaveIndicator({ isSaving, lastSaved, isDirty }: AutosaveIndicatorProps) {
  if (!isDirty && !lastSaved) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Salvando...</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-3 w-3 text-primary" />
          <span>Salvo automaticamente</span>
        </>
      ) : null}
    </div>
  );
}
