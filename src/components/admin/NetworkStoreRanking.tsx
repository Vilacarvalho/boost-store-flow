import { useState } from "react";
import { Trophy, TrendingUp, BarChart3, Target, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/currency";

export interface StoreRankingEntry {
  id: string;
  name: string;
  total_value: number;
  won_sales: number;
  total_sales: number;
  conversion_rate: number;
  avg_ticket: number;
  goal_pct: number;
}

interface NetworkStoreRankingProps {
  daily: StoreRankingEntry[];
  weekly: StoreRankingEntry[];
  monthly: StoreRankingEntry[];
}

type SortMode = "revenue" | "ticket" | "conversion" | "goal";

const NetworkStoreRanking = ({ daily, weekly, monthly }: NetworkStoreRankingProps) => {
  const [period, setPeriod] = useState("daily");
  const [sort, setSort] = useState<SortMode>("revenue");

  const dataMap: Record<string, StoreRankingEntry[]> = { daily, weekly, monthly };
  const raw = dataMap[period] || [];

  const sorted = [...raw].sort((a, b) => {
    switch (sort) {
      case "ticket": return (b.avg_ticket || 0) - (a.avg_ticket || 0);
      case "conversion": return (b.conversion_rate || 0) - (a.conversion_rate || 0);
      case "goal": return (b.goal_pct || 0) - (a.goal_pct || 0);
      default: return (b.total_value || 0) - (a.total_value || 0);
    }
  });

  const sortButtons: { key: SortMode; label: string; icon: React.ElementType }[] = [
    { key: "revenue", label: "Faturamento", icon: TrendingUp },
    { key: "ticket", label: "Ticket Médio", icon: BarChart3 },
    { key: "conversion", label: "Conversão", icon: BarChart3 },
    { key: "goal", label: "Meta", icon: Target },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Ranking de Lojas
      </h2>

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1 text-xs">Hoje</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 text-xs">Semana</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1 text-xs">Mês</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-1.5 flex-wrap">
        {sortButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSort(btn.key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              sort === btn.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            <btn.icon className="h-3 w-3" />
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados para este período.</p>
        )}
        {sorted.map((store, i) => {
          const isAtRisk = store.goal_pct > 0 && store.goal_pct < 70;

          return (
            <div key={store.id} className={`bg-card rounded-2xl p-4 shadow-card flex items-center gap-3 ${isAtRisk ? "ring-1 ring-destructive/20" : ""}`}>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary shrink-0">
                {i === 0 ? (
                  <Trophy className="h-4 w-4 text-warning" />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {store.name}
                  {isAtRisk && <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {store.conversion_rate.toFixed(1)}% conv. · {store.total_sales} atend.
                  {store.goal_pct > 0 && ` · Meta ${store.goal_pct.toFixed(0)}%`}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                {sort === "ticket"
                  ? formatBRL(store.avg_ticket || 0)
                  : sort === "conversion"
                  ? `${store.conversion_rate.toFixed(1)}%`
                  : sort === "goal" && store.goal_pct > 0
                  ? `${store.goal_pct.toFixed(0)}%`
                  : formatBRL(store.total_value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NetworkStoreRanking;
