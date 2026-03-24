import { Target, Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/currency";

interface GoalPeriod {
  label: string;
  icon: React.ElementType;
  goal: number;
  realized: number;
  projection: number;
  daysRemaining: number;
}

interface SellerGoalCardsProps {
  periods: GoalPeriod[];
}

function getStatus(pct: number, daysRemaining: number, isDaily: boolean): "above" | "on_track" | "below" {
  if (pct >= 100) return "above";
  if (isDaily) return pct >= 50 ? "on_track" : "below";
  // For weekly/monthly, estimate expected pace
  const totalDays = isDaily ? 1 : daysRemaining + 1; // rough
  const expectedPct = totalDays > 0 ? ((totalDays - daysRemaining) / totalDays) * 100 : 100;
  if (pct >= expectedPct * 0.9) return "on_track";
  return "below";
}

const statusStyles = {
  above: "border-success/30 bg-success/5",
  on_track: "border-primary/20 bg-card",
  below: "border-warning/30 bg-warning/5",
};

const statusBadge = {
  above: { label: "Acima", className: "bg-success/10 text-success" },
  on_track: { label: "No ritmo", className: "bg-primary/10 text-primary" },
  below: { label: "Atenção", className: "bg-warning/10 text-warning" },
};

const SellerGoalCards = ({ periods }: SellerGoalCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {periods.map((p) => {
        const pct = p.goal > 0 ? (p.realized / p.goal) * 100 : 0;
        const remaining = Math.max(0, p.goal - p.realized);
        const Icon = p.icon;
        const isDaily = p.daysRemaining === 0;
        const status = p.goal > 0 ? getStatus(pct, p.daysRemaining, isDaily) : "on_track";
        const badge = statusBadge[status];

        return (
          <div key={p.label} className={`rounded-2xl p-4 shadow-card space-y-2 border ${statusStyles[status]}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {p.label}
              </span>
              <div className="flex items-center gap-1.5">
                {p.goal > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatBRL(p.realized)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                / {formatBRL(p.goal)}
              </span>
            </div>
            <Progress value={Math.min(pct, 100)} className="h-1.5 rounded-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct.toFixed(0)}% atingido</span>
              {remaining > 0 ? (
                <span>Falta {formatBRL(remaining)}</span>
              ) : (
                <span className="text-success font-medium">✓ Atingida</span>
              )}
            </div>
            {p.projection > 0 && p.goal > 0 && remaining > 0 && (
              <p className="text-xs text-muted-foreground">
                Projeção: {formatBRL(p.projection)} · {p.daysRemaining}d restantes
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SellerGoalCards;
