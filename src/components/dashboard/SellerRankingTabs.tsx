import { useState } from "react";
import { Trophy, TrendingUp, BarChart3, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/currency";

export interface RankingEntry {
  seller_id: string;
  seller_name: string;
  total_value: number;
  won_count: number;
  total_count: number;
  conversion_rate: number;
  avg_ticket: number;
  avg_pa: number;
}

interface SellerRankingTabsProps {
  daily: RankingEntry[];
  weekly: RankingEntry[];
  monthly: RankingEntry[];
  currentUserId: string;
  /** Goal achievement data keyed by seller_id */
  goalAchievement?: Record<string, { pct: number }>;
}

type SortMode = "revenue" | "ticket" | "conversion" | "goal";

const SellerRankingTabs = ({
  daily,
  weekly,
  monthly,
  currentUserId,
  goalAchievement,
}: SellerRankingTabsProps) => {
  const [period, setPeriod] = useState("daily");
  const [sort, setSort] = useState<SortMode>("revenue");

  const dataMap: Record<string, RankingEntry[]> = { daily, weekly, monthly };
  const raw = dataMap[period] || [];

  const sorted = [...raw].sort((a, b) => {
    switch (sort) {
      case "ticket":
        return (b.avg_ticket || 0) - (a.avg_ticket || 0);
      case "conversion":
        return (b.conversion_rate || 0) - (a.conversion_rate || 0);
      case "goal":
        return (goalAchievement?.[b.seller_id]?.pct || 0) - (goalAchievement?.[a.seller_id]?.pct || 0);
      default:
        return (b.total_value || 0) - (a.total_value || 0);
    }
  });

  const myPosition = sorted.findIndex((s) => s.seller_id === currentUserId) + 1;

  const sortButtons: { key: SortMode; label: string; icon: React.ElementType }[] = [
    { key: "revenue", label: "Faturamento", icon: TrendingUp },
    { key: "ticket", label: "Ticket Médio", icon: BarChart3 },
    { key: "conversion", label: "Conversão", icon: BarChart3 },
    { key: "goal", label: "Meta", icon: Target },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Ranking da Equipe
        </h2>
        {myPosition > 0 && (
          <span className="text-xs font-medium text-primary">
            Você está em {myPosition}º lugar
          </span>
        )}
      </div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1 text-xs">Hoje</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 text-xs">Semana</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1 text-xs">Mês</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sort buttons */}
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

      {/* Ranking list */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados para este período.
          </p>
        )}
        {sorted.map((seller, i) => {
          const isMe = seller.seller_id === currentUserId;
          const goalPct = goalAchievement?.[seller.seller_id]?.pct;

          return (
            <div
              key={seller.seller_id}
              className={`bg-card rounded-2xl p-4 shadow-card flex items-center gap-3 ${
                isMe ? "ring-2 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary shrink-0">
                {i === 0 ? (
                  <Trophy className="h-4 w-4 text-warning" />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {seller.seller_name} {isMe && <span className="text-primary">(você)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {seller.conversion_rate}% conv. · TM {formatBRL(seller.avg_ticket || 0)} · P.A. {Number(seller.avg_pa || 0).toFixed(1)}
                  {goalPct !== undefined && ` · Meta ${goalPct.toFixed(0)}%`}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                {sort === "ticket"
                  ? formatBRL(seller.avg_ticket || 0)
                  : sort === "conversion"
                  ? `${seller.conversion_rate}%`
                  : sort === "goal" && goalPct !== undefined
                  ? `${goalPct.toFixed(0)}%`
                  : formatBRL(seller.total_value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SellerRankingTabs;
