import { Gauge } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface RequiredVelocityProps {
  goal: number;
  realized: number;
  daysRemaining: number;
  label?: string;
}

const RequiredVelocity = ({ goal, realized, daysRemaining, label }: RequiredVelocityProps) => {
  if (goal <= 0 || realized >= goal || daysRemaining <= 0) return null;

  const remaining = goal - realized;
  const velocityNeeded = remaining / daysRemaining;

  // Compare with current daily avg
  const now = new Date();
  const dayOfMonth = now.getDate();
  const currentDailyAvg = dayOfMonth > 0 ? realized / dayOfMonth : 0;
  const pctIncrease = currentDailyAvg > 0 ? ((velocityNeeded / currentDailyAvg) - 1) * 100 : 0;

  return (
    <div className="rounded-2xl p-3 border border-border bg-card shadow-card space-y-1">
      <div className="flex items-center gap-1.5">
        <Gauge className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label || "Velocidade Necessária"}
        </span>
      </div>
      <p className="text-lg font-semibold text-foreground tabular-nums">
        {formatBRL(velocityNeeded)}<span className="text-xs font-normal text-muted-foreground">/dia</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {pctIncrease > 5
          ? `Necessário ${pctIncrease.toFixed(0)}% a mais que o ritmo atual`
          : pctIncrease < -5
            ? "Ritmo atual é suficiente para atingir a meta"
            : "Ritmo atual está no limite para atingir a meta"}
      </p>
    </div>
  );
};

export default RequiredVelocity;
