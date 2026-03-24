import { Trophy, TrendingUp, BarChart3, Target } from "lucide-react";
import { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import { formatBRL } from "@/lib/currency";

interface TeamHighlightsProps {
  dailyRanking: RankingEntry[];
}

const TeamHighlights = ({ dailyRanking }: TeamHighlightsProps) => {
  if (!dailyRanking.length) return null;

  const byRevenue = [...dailyRanking].sort((a, b) => b.total_value - a.total_value);
  const byConversion = [...dailyRanking].sort((a, b) => b.conversion_rate - a.conversion_rate);
  const byTicket = [...dailyRanking].sort((a, b) => (b.avg_ticket || 0) - (a.avg_ticket || 0));

  const top = byRevenue[0];
  const topConv = byConversion[0];
  const topTicket = byTicket[0];

  if (!top || top.total_value === 0) return null;

  const highlights = [
    { label: "Maior Faturamento", name: top.seller_name, value: formatBRL(top.total_value), icon: Trophy, color: "text-warning" },
    { label: "Melhor Conversão", name: topConv.seller_name, value: `${topConv.conversion_rate}%`, icon: BarChart3, color: "text-primary" },
    { label: "Maior Ticket", name: topTicket.seller_name, value: formatBRL(topTicket.avg_ticket || 0), icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-warning" />
        Destaques do Dia
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {highlights.map((h) => (
          <div key={h.label} className="bg-card rounded-2xl p-3 shadow-card text-center space-y-1">
            <h.icon className={`h-4 w-4 mx-auto ${h.color}`} />
            <p className="text-sm font-bold tabular-nums text-foreground">{h.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{h.label}</p>
            <p className="text-xs font-medium text-foreground truncate">{h.name.split(" ")[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamHighlights;
