import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/currency";
import { Trophy, TrendingUp, BarChart3, Target, ShoppingCart } from "lucide-react";

export interface StoreRankingEntry {
  store_id: string;
  store_name: string;
  total_value: number;
  won_sales: number;
  total_sales: number;
  conversion_rate: number;
  avg_ticket: number;
  goal_target: number;
  goal_current: number;
  goal_pct: number;
}

interface Props {
  daily: StoreRankingEntry[];
  weekly: StoreRankingEntry[];
  monthly: StoreRankingEntry[];
}

type SortKey = "revenue" | "conversion" | "ticket" | "goal";

const sortLabels: Record<SortKey, { label: string; icon: typeof TrendingUp }> = {
  revenue: { label: "Faturamento", icon: TrendingUp },
  conversion: { label: "Conversão", icon: BarChart3 },
  ticket: { label: "Ticket Médio", icon: ShoppingCart },
  goal: { label: "Meta", icon: Target },
};

function sortStores(stores: StoreRankingEntry[], key: SortKey): StoreRankingEntry[] {
  return [...stores].sort((a, b) => {
    if (key === "revenue") return b.total_value - a.total_value;
    if (key === "conversion") return b.conversion_rate - a.conversion_rate;
    if (key === "ticket") return b.avg_ticket - a.avg_ticket;
    return b.goal_pct - a.goal_pct;
  });
}

function getValue(entry: StoreRankingEntry, key: SortKey): string {
  if (key === "revenue") return formatBRL(entry.total_value);
  if (key === "conversion") return `${entry.conversion_rate}%`;
  if (key === "ticket") return formatBRL(entry.avg_ticket);
  return `${entry.goal_pct}%`;
}

const SupervisorStoreRanking = ({ daily, weekly, monthly }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");

  const renderList = (data: StoreRankingEntry[]) => {
    const sorted = sortStores(data, sortKey);
    if (sorted.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum dado disponível para este período.
        </p>
      );
    }
    return (
      <div className="space-y-1.5">
        {sorted.map((s, i) => (
          <div
            key={s.store_id}
            className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                {i + 1}
              </span>
              {i === 0 && <Trophy className="h-3.5 w-3.5 text-yellow-500" />}
              <span className="text-sm font-medium text-foreground">{s.store_name}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {getValue(s, sortKey)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Ranking entre Lojas
        </CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {(Object.keys(sortLabels) as SortKey[]).map((key) => {
            const { label, icon: Icon } = sortLabels[key];
            return (
              <Badge
                key={key}
                variant={sortKey === key ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSortKey(key)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Hoje</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
          <TabsContent value="day">{renderList(daily)}</TabsContent>
          <TabsContent value="week">{renderList(weekly)}</TabsContent>
          <TabsContent value="month">{renderList(monthly)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SupervisorStoreRanking;
