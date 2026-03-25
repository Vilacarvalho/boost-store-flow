import { Zap } from "lucide-react";

interface DailyPriorityProps {
  message: string;
  severity?: "critical" | "warning" | "info";
}

const severityStyles = {
  critical: "border-destructive/20 bg-destructive/5",
  warning: "border-warning/20 bg-warning/5",
  info: "border-primary/20 bg-primary/5",
};

const iconStyles = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
};

const DailyPriority = ({ message, severity = "info" }: DailyPriorityProps) => {
  return (
    <div className={`rounded-2xl p-3 border ${severityStyles[severity]} flex items-start gap-2.5`}>
      <div className="mt-0.5">
        <Zap className={`h-4 w-4 ${iconStyles[severity]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prioridade do Dia
        </span>
        <p className="text-sm font-medium text-foreground mt-0.5 leading-snug">{message}</p>
      </div>
    </div>
  );
};

export default DailyPriority;
