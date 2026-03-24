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

const SellerGoalCards = ({ periods }: SellerGoalCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {periods.map((p) => {
        const pct = p.goal > 0 ? (p.realized / p.goal) * 100 : 0;
        const remaining = Math.max(0, p.goal - p.realized);
        const Icon = p.icon;

        return (
          <div key={p.label} className="bg-card rounded-2xl p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {p.label}
              </span>
              <Icon className="h-4 w-4 text-primary" />
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
