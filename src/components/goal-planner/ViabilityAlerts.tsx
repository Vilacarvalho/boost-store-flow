import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert } from "lucide-react";

export interface ViabilityAlert {
  type: "info" | "warning" | "danger" | "success";
  key: string;
  title: string;
  message: string;
}

export function getViabilityAlerts(
  suggested: number,
  breakEven: number,
  previousRevenue: number
): ViabilityAlert[] {
  const alerts: ViabilityAlert[] = [];

  if (previousRevenue > 0 && suggested <= breakEven && suggested < previousRevenue) {
    alerts.push({
      type: "warning",
      key: "adjusted-break-even",
      title: "Ponto de equilíbrio",
      message: "Meta ajustada para o ponto de equilíbrio — projeção ficou abaixo do mínimo.",
    });
  }

  if (previousRevenue > 0) {
    const diff = ((suggested - previousRevenue) / previousRevenue) * 100;

    if (diff > 25) {
      alerts.push({
        type: "danger",
        key: "aggressive",
        title: "Meta agressiva",
        message: `Meta ${diff.toFixed(1)}% acima do faturamento anterior. Revisar viabilidade.`,
      });
    } else if (diff > 15) {
      alerts.push({
        type: "warning",
        key: "challenging",
        title: "Meta desafiadora",
        message: `Meta ${diff.toFixed(1)}% acima do faturamento anterior.`,
      });
    }
  }

  if (breakEven > 0 && suggested > 0) {
    const margin = ((suggested - breakEven) / breakEven) * 100;
    if (margin < 5 && margin >= 0) {
      alerts.push({
        type: "warning",
        key: "tight-margin",
        title: "Margem apertada",
        message: "Meta com margem operacional muito próxima do ponto de equilíbrio.",
      });
    }
  }

  if (alerts.length === 0 && suggested > 0) {
    alerts.push({
      type: "success",
      key: "ok",
      title: "Meta viável",
      message: "Projeção dentro de parâmetros saudáveis.",
    });
  }

  return alerts;
}

const iconMap = {
  info: AlertTriangle,
  warning: AlertTriangle,
  danger: ShieldAlert,
  success: CheckCircle2,
};

const colorMap = {
  info: "border-primary/30 bg-primary/5",
  warning: "border-warning/30 bg-warning/5",
  danger: "border-destructive/30 bg-destructive/5",
  success: "border-success/30 bg-success/5",
};

const iconColorMap = {
  info: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
};

interface Props {
  alerts: ViabilityAlert[];
}

const ViabilityAlerts = ({ alerts }: Props) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const Icon = iconMap[a.type];
        return (
          <Alert key={a.key} className={colorMap[a.type]}>
            <Icon className={`h-4 w-4 ${iconColorMap[a.type]}`} />
            <AlertTitle className="text-sm font-medium">{a.title}</AlertTitle>
            <AlertDescription className="text-xs">{a.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};

export default ViabilityAlerts;
