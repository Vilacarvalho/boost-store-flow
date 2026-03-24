import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/currency";

interface StoreProjectionProps {
  goalTarget: number;
  goalCurrent: number;
}

const StoreProjection = ({ goalTarget, goalCurrent }: StoreProjectionProps) => {
  if (goalTarget <= 0) return null;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayElapsed = now.getDate();
  const daysLeft = daysInMonth - dayElapsed;
  const projectedValue = dayElapsed > 0 ? (goalCurrent / dayElapsed) * daysInMonth : 0;
  const remaining = Math.max(0, goalTarget - goalCurrent);
  const perDayNeeded = daysLeft > 0 ? remaining / daysLeft : remaining;
  const goalProgress = (goalCurrent / goalTarget) * 100;

  const statusColor = goalProgress >= 100 ? "text-success" : projectedValue >= goalTarget ? "text-primary" : "text-destructive";

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta da Loja (Mensal)</span>
        <Target className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{formatBRL(goalCurrent)}</span>
        <span className="text-sm text-muted-foreground tabular-nums">/ {formatBRL(goalTarget)}</span>
      </div>
      <Progress value={Math.min(goalProgress, 100)} className="h-2 rounded-full" />
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground tabular-nums">{goalProgress.toFixed(0)}%</p>
          <p>atingido</p>
        </div>
        <div>
          <p className={`font-medium tabular-nums ${statusColor}`}>{formatBRL(projectedValue)}</p>
          <p>projeção</p>
        </div>
        <div>
          <p className="font-medium text-foreground tabular-nums">{formatBRL(remaining)}</p>
          <p>restante</p>
        </div>
        <div>
          <p className="font-medium text-foreground tabular-nums">{formatBRL(perDayNeeded)}</p>
          <p>por dia p/ bater</p>
        </div>
      </div>
    </div>
  );
};

export default StoreProjection;
