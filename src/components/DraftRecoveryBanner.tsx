import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftRecoveryBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ onRestore, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <RotateCcw className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm text-foreground flex-1">
        Encontramos um rascunho não salvo. Deseja restaurar?
      </p>
      <Button size="sm" variant="default" onClick={onRestore} className="shrink-0">
        Restaurar
      </Button>
      <Button size="sm" variant="ghost" onClick={onDiscard} className="shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
