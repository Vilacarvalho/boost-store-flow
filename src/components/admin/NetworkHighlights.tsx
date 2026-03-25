import { Trophy, TrendingUp, BarChart3 } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface StoreMetric {
  name: string;
  total_value: number;
  conversion_rate: number;
  avg_ticket: number;
}

interface NetworkHighlightsProps {
  stores: StoreMetric[];
}

const NetworkHighlights = ({ stores }: NetworkHighlightsProps) => {
  if (stores.length === 0) return null;

  const topRevenue = [...stores].sort((a, b) => b.total_value - a.total_value)[0];
  const topConversion = [...stores].sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
  const topTicket = [...stores].sort((a, b) => b.avg_ticket - a.avg_ticket)[0];

  const highlights = [
    { label: "Maior Faturamento", icon: Trophy, value: topRevenue.name, sub: formatBRL(topRevenue.total_value) },
    { label: "Melhor Conversão", icon: BarChart3, value: topConversion.name, sub: `${topConversion.conversion_rate.toFixed(1)}%` },
    { label: "Maior Ticket", icon: TrendingUp, value: topTicket.name, sub: formatBRL(topTicket.avg_ticket) },
  ].filter(h => h.sub !== formatBRL(0) && h.sub !== "0.0%");

  if (highlights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destaques da Rede</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {highlights.map((h) => (
          <div key={h.label} className="bg-card rounded-2xl p-4 shadow-card space-y-1">
            <div className="flex items-center gap-1.5">
              <h.icon className="h-3.5 w-3.5 text-warning" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{h.label}</span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{h.value}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{h.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkHighlights;
