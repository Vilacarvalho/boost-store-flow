import { Trophy, BarChart3, TrendingUp } from "lucide-react";
import { RankingEntry } from "./SellerRankingTabs";

interface QuickRankingSummaryProps {
  dailyRanking: RankingEntry[];
  currentUserId: string;
}

const QuickRankingSummary = ({ dailyRanking, currentUserId }: QuickRankingSummaryProps) => {
  if (!dailyRanking.length) return null;

  const byRevenue = [...dailyRanking].sort((a, b) => b.total_value - a.total_value);
  const byConversion = [...dailyRanking].sort((a, b) => b.conversion_rate - a.conversion_rate);
  const byTicket = [...dailyRanking].sort((a, b) => (b.avg_ticket || 0) - (a.avg_ticket || 0));

  const revenuePos = byRevenue.findIndex(s => s.seller_id === currentUserId) + 1;
  const conversionPos = byConversion.findIndex(s => s.seller_id === currentUserId) + 1;
  const ticketPos = byTicket.findIndex(s => s.seller_id === currentUserId) + 1;

  const total = dailyRanking.length;

  const items = [
    { label: "Ranking", pos: revenuePos, icon: Trophy, color: "text-warning" },
    { label: "Conversão", pos: conversionPos, icon: BarChart3, color: "text-primary" },
    { label: "Ticket", pos: ticketPos, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.label} className="bg-card rounded-2xl p-3 shadow-card text-center space-y-1">
          <item.icon className={`h-4 w-4 mx-auto ${item.color}`} />
          <p className="text-xl font-bold tabular-nums text-foreground">
            {item.pos > 0 ? `${item.pos}º` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
          {item.pos > 0 && (
            <p className="text-[10px] text-muted-foreground">de {total}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuickRankingSummary;
