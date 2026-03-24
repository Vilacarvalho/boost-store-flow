import { Lightbulb } from "lucide-react";
import { formatBRL } from "@/lib/currency";
import { RankingEntry } from "./SellerRankingTabs";

interface ContextualMessagesProps {
  dailyRanking: RankingEntry[];
  currentUserId: string;
  dailyGoal: number;
  dailyRealized: number;
}

const ContextualMessages = ({ dailyRanking, currentUserId, dailyGoal, dailyRealized }: ContextualMessagesProps) => {
  const messages: string[] = [];

  // Goal message
  const remaining = dailyGoal - dailyRealized;
  if (remaining > 0) {
    messages.push(`Faltam ${formatBRL(remaining)} para bater sua meta do dia.`);
  } else if (dailyRealized > 0) {
    messages.push("🎉 Parabéns! Meta do dia batida!");
  }

  // Ranking messages
  if (dailyRanking.length > 1) {
    const me = dailyRanking.find(s => s.seller_id === currentUserId);

    // Revenue position
    const byRevenue = [...dailyRanking].sort((a, b) => b.total_value - a.total_value);
    const revPos = byRevenue.findIndex(s => s.seller_id === currentUserId) + 1;
    if (revPos > 0) {
      messages.push(`Você está em ${revPos}º lugar em faturamento hoje.`);
    }

    // Conversion comparison
    const byConv = [...dailyRanking].sort((a, b) => b.conversion_rate - a.conversion_rate);
    const convPos = byConv.findIndex(s => s.seller_id === currentUserId) + 1;
    const avgConvStore = dailyRanking.reduce((sum, s) => sum + s.conversion_rate, 0) / dailyRanking.length;
    if (me && me.conversion_rate < avgConvStore && avgConvStore > 0) {
      messages.push(`Sua conversão (${me.conversion_rate}%) está abaixo da média da loja (${avgConvStore.toFixed(1)}%).`);
    } else if (convPos > 0 && convPos <= 2) {
      messages.push(`Você está em ${convPos}º em conversão hoje — continue assim!`);
    }

    // Ticket comparison
    if (me) {
      const avgTicketStore = dailyRanking.reduce((sum, s) => sum + (s.avg_ticket || 0), 0) / dailyRanking.length;
      if ((me.avg_ticket || 0) > avgTicketStore && avgTicketStore > 0) {
        messages.push("Seu ticket médio está acima da média da loja.");
      } else if (avgTicketStore > 0 && (me.avg_ticket || 0) < avgTicketStore) {
        messages.push(`Seu ticket médio está abaixo da média da loja (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(avgTicketStore)}).`);
      }
    }

    // Gap to next position
    if (revPos > 1 && me) {
      const above = byRevenue[revPos - 2];
      const gap = above.total_value - me.total_value;
      if (gap > 0) {
        messages.push(`Faltam ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(gap)} para subir para ${revPos - 1}º lugar.`);
      }
    }
  }

  if (!messages.length) return null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Insights</span>
      </div>
      {messages.map((msg, i) => (
        <p key={i} className="text-xs text-foreground leading-relaxed">{msg}</p>
      ))}
    </div>
  );
};

export default ContextualMessages;
