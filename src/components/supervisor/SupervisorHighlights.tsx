import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, BarChart3, ShoppingCart, TrendingDown } from "lucide-react";
import { formatBRL } from "@/lib/currency";
import type { StoreRankingEntry } from "./SupervisorStoreRanking";

interface Props {
  stores: StoreRankingEntry[];
}

const SupervisorHighlights = ({ stores }: Props) => {
  if (stores.length === 0) return null;

  const byRevenue = [...stores].sort((a, b) => b.total_value - a.total_value);
  const byConversion = [...stores].filter(s => s.total_sales > 0).sort((a, b) => b.conversion_rate - a.conversion_rate);
  const byTicket = [...stores].filter(s => s.won_sales > 0).sort((a, b) => b.avg_ticket - a.avg_ticket);

  const best = byRevenue[0];
  const worst = byRevenue[byRevenue.length - 1];
  const bestConversion = byConversion[0];
  const bestTicket = byTicket[0];

  const items = [
    best && { icon: Star, label: "Melhor Faturamento", store: best.store_name, value: formatBRL(best.total_value), color: "text-yellow-500" },
    bestConversion && { icon: BarChart3, label: "Melhor Conversão", store: bestConversion.store_name, value: `${bestConversion.conversion_rate}%`, color: "text-emerald-500" },
    bestTicket && { icon: ShoppingCart, label: "Maior Ticket", store: bestTicket.store_name, value: formatBRL(bestTicket.avg_ticket), color: "text-blue-500" },
    worst && byRevenue.length > 1 && { icon: TrendingDown, label: "Menor Faturamento", store: worst.store_name, value: formatBRL(worst.total_value), color: "text-muted-foreground" },
  ].filter(Boolean) as { icon: typeof Star; label: string; store: string; value: string; color: string }[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Destaques do Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{item.store}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SupervisorHighlights;
