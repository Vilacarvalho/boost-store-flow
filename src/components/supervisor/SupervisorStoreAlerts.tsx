import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, ShoppingCart, XCircle, CalendarX, Plus } from "lucide-react";
import type { StoreRankingEntry } from "./SupervisorStoreRanking";
import type { CreateActionPayload } from "./StoreActionPlans";

interface AlertItem {
  icon: typeof AlertTriangle;
  store: string;
  storeId: string;
  message: string;
  severity: "high" | "medium";
  source: string;
}

interface Props {
  stores: StoreRankingEntry[];
  networkAvgConversion: number;
  networkAvgTicket: number;
  storesWithoutRecentVisit: { id: string; name: string }[];
  onCreateAction?: (payload: CreateActionPayload) => void;
}

const SupervisorStoreAlerts = ({ stores, networkAvgConversion, networkAvgTicket, storesWithoutRecentVisit, onCreateAction }: Props) => {
  const alerts: AlertItem[] = [];

  for (const s of stores) {
    if (s.goal_target > 0 && s.goal_pct < 70) {
      alerts.push({
        icon: TrendingDown,
        store: s.store_name,
        storeId: s.store_id,
        message: `Meta em ${s.goal_pct.toFixed(0)}% — abaixo do esperado`,
        severity: "high",
        source: "Meta baixa",
      });
    }
    if (s.conversion_rate < networkAvgConversion * 0.8 && s.total_sales > 0) {
      alerts.push({
        icon: AlertTriangle,
        store: s.store_name,
        storeId: s.store_id,
        message: `Conversão de ${s.conversion_rate}% abaixo da média da rede (${networkAvgConversion.toFixed(0)}%)`,
        severity: "high",
        source: "Conversão baixa",
      });
    }
    if (s.avg_ticket < networkAvgTicket * 0.7 && s.won_sales > 0) {
      alerts.push({
        icon: ShoppingCart,
        store: s.store_name,
        storeId: s.store_id,
        message: `Ticket médio baixo comparado à rede`,
        severity: "medium",
        source: "Ticket baixo",
      });
    }
    if (s.total_sales > 5 && s.won_sales === 0) {
      alerts.push({
        icon: XCircle,
        store: s.store_name,
        storeId: s.store_id,
        message: `${s.total_sales} atendimentos sem vendas`,
        severity: "high",
        source: "Sem vendas",
      });
    }
  }

  for (const s of storesWithoutRecentVisit) {
    alerts.push({
      icon: CalendarX,
      store: s.name,
      storeId: s.id,
      message: "Sem visita recente registrada",
      severity: "medium",
      source: "Sem visita",
    });
  }

  alerts.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          ✅ Nenhum alerta crítico identificado nas lojas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Alertas por Loja
          <span className="text-xs font-normal text-muted-foreground">({alerts.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map((a, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg px-3 py-2 ${a.severity === "high" ? "bg-destructive/10" : "bg-muted/50"}`}
          >
            <a.icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === "high" ? "text-destructive" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{a.store}</p>
              <p className="text-xs text-muted-foreground">{a.message}</p>
            </div>
            {onCreateAction && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-7 text-xs"
                onClick={() => onCreateAction({
                  storeId: a.storeId,
                  storeName: a.store,
                  issue: a.message,
                  source: a.source,
                })}
              >
                <Plus className="h-3 w-3 mr-1" /> Ação
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SupervisorStoreAlerts;
