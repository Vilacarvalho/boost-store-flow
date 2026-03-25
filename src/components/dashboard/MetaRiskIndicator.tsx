import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface MetaRiskIndicatorProps {
  goal: number;
  realized: number;
  projection: number;
  daysRemaining: number;
  label?: string;
}

type RiskLevel = "high" | "moderate" | "safe";

function getRiskLevel(goal: number, projection: number): RiskLevel {
  if (goal <= 0) return "safe";
  const pct = (projection / goal) * 100;
  if (pct >= 95) return "safe";
  if (pct >= 75) return "moderate";
  return "high";
}

const riskConfig = {
  high: {
    label: "Risco alto",
    icon: ShieldAlert,
    bg: "bg-destructive/5 border-destructive/20",
    text: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  moderate: {
    label: "Risco moderado",
    icon: Shield,
    bg: "bg-warning/5 border-warning/20",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  safe: {
    label: "Meta segura",
    icon: ShieldCheck,
    bg: "bg-success/5 border-success/20",
    text: "text-success",
    badge: "bg-success/10 text-success",
  },
};

const MetaRiskIndicator = ({ goal, realized, projection, daysRemaining, label }: MetaRiskIndicatorProps) => {
  if (goal <= 0) return null;

  const risk = getRiskLevel(goal, projection);
  const config = riskConfig[risk];
  const Icon = config.icon;
  const velocityNeeded = daysRemaining > 0 ? (goal - realized) / daysRemaining : 0;

  return (
    <div className={`rounded-2xl p-3 border ${config.bg} space-y-1.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${config.text}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label || "Risco de Meta"}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
      </div>
      {daysRemaining > 0 && velocityNeeded > 0 && realized < goal && (
        <p className="text-xs text-foreground">
          Necessário vender <span className="font-semibold tabular-nums">{formatBRL(velocityNeeded)}</span>/dia nos próximos {daysRemaining} dias
        </p>
      )}
      {realized >= goal && (
        <p className="text-xs text-success font-medium">✓ Meta atingida</p>
      )}
    </div>
  );
};

export default MetaRiskIndicator;
