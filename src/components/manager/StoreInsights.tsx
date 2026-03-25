import { Lightbulb } from "lucide-react";
import { formatBRL } from "@/lib/currency";
import { RankingEntry } from "@/components/dashboard/SellerRankingTabs";

interface StoreInsightsProps {
  dailyRanking: RankingEntry[];
  storeMetrics: {
    total_value: number;
    conversion_rate: number;
    avg_ticket: number;
    total_attendances: number;
  };
  dailyGoal: number;
  weeklyGoal: number;
  weeklyRealized: number;
  monthlyGoal: number;
  monthlyRealized: number;
}

const StoreInsights = ({
  dailyRanking,
  storeMetrics,
  dailyGoal,
  weeklyGoal,
  weeklyRealized,
  monthlyGoal,
  monthlyRealized,
}: StoreInsightsProps) => {
  const messages: string[] = [];

  // Daily goal status
  const dailyRemaining = dailyGoal - storeMetrics.total_value;
  if (dailyGoal > 0 && dailyRemaining > 0 && storeMetrics.total_value < dailyGoal * 0.5) {
    messages.push("Loja abaixo do ritmo da meta diária.");
  }

  // Weekly risk
  if (weeklyGoal > 0) {
    const now = new Date();
    const day = now.getDay();
    const weekDaysPassed = day === 0 ? 7 : day;
    const expectedWeeklyPct = (weekDaysPassed / 7) * 100;
    const actualWeeklyPct = (weeklyRealized / weeklyGoal) * 100;
    if (actualWeeklyPct < expectedWeeklyPct * 0.8) {
      messages.push("Meta semanal em risco — ritmo abaixo do esperado.");
    }
  }

  // Monthly risk
  if (monthlyGoal > 0) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayElapsed = now.getDate();
    const expectedMonthlyPct = (dayElapsed / daysInMonth) * 100;
    const actualMonthlyPct = (monthlyRealized / monthlyGoal) * 100;
    if (actualMonthlyPct < expectedMonthlyPct * 0.8) {
      messages.push("Meta mensal em risco — ritmo precisa aumentar.");
    }
  }

  // Conversion change
  if (dailyRanking.length > 0) {
    const avgConv = dailyRanking.reduce((s, r) => s + r.conversion_rate, 0) / dailyRanking.length;
    if (avgConv < 30) {
      messages.push(`Conversão média da equipe está em ${avgConv.toFixed(1)}% — abaixo do ideal.`);
    }
  }

  // Avg ticket highlight
  if (dailyRanking.length > 0) {
    const avgTicket = dailyRanking.reduce((s, r) => s + (r.avg_ticket || 0), 0) / dailyRanking.length;
    if (avgTicket > 0) {
      const storeAvg = storeMetrics.avg_ticket;
      if (storeAvg > avgTicket * 1.1) {
        messages.push("Ticket médio da loja aumentou hoje em relação à média da equipe.");
      }
    }
  }

  // Sellers without sales
  const sellersWithoutSales = dailyRanking.filter(r => r.total_value === 0);
  if (sellersWithoutSales.length > 0) {
    if (sellersWithoutSales.length === 1) {
      messages.push(`${sellersWithoutSales[0].seller_name.split(" ")[0]} sem vendas hoje.`);
    } else {
      messages.push(`${sellersWithoutSales.length} vendedores sem vendas hoje.`);
    }
  }

  // No attendances at all
  if (storeMetrics.total_attendances === 0) {
    messages.push("Nenhum atendimento registrado hoje na loja.");
  }

  if (!messages.length) return null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Insights da Loja</span>
      </div>
      {messages.map((msg, i) => (
        <p key={i} className="text-xs text-foreground leading-relaxed">{msg}</p>
      ))}
    </div>
  );
};

export default StoreInsights;
