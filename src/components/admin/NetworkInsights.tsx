import { Lightbulb } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface StoreMetric {
  id: string;
  name: string;
  total_value: number;
  won_sales: number;
  total_sales: number;
  conversion_rate: number;
  avg_ticket: number;
  goal_target: number;
  goal_current: number;
}

interface NetworkInsightsProps {
  stores: StoreMetric[];
  networkGoal: number;
  networkCurrent: number;
  weeklyGoal: number;
  weeklyRealized: number;
}

const NetworkInsights = ({ stores, networkGoal, networkCurrent, weeklyGoal, weeklyRealized }: NetworkInsightsProps) => {
  const messages: string[] = [];

  // Network-level daily insights
  const totalValue = stores.reduce((s, st) => s + st.total_value, 0);
  const avgConversion = stores.length > 0
    ? stores.reduce((s, st) => s + st.conversion_rate, 0) / stores.length
    : 0;

  if (avgConversion > 0 && avgConversion < 30) {
    messages.push(`Conversão média da rede está em ${avgConversion.toFixed(1)}% — abaixo do ideal.`);
  }

  // Avg ticket
  const avgTicket = stores.length > 0
    ? stores.reduce((s, st) => s + st.avg_ticket, 0) / stores.length
    : 0;

  // Weekly rhythm
  if (weeklyGoal > 0) {
    const now = new Date();
    const day = now.getDay();
    const weekDaysPassed = day === 0 ? 7 : day;
    const expectedPct = (weekDaysPassed / 7) * 100;
    const actualPct = (weeklyRealized / weeklyGoal) * 100;
    if (actualPct >= expectedPct * 1.1) {
      messages.push("Rede acima do ritmo semanal.");
    } else if (actualPct < expectedPct * 0.8) {
      messages.push("Meta semanal da rede em risco — ritmo abaixo do esperado.");
    }
  }

  // Monthly risk
  if (networkGoal > 0) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayElapsed = now.getDate();
    const expectedPct = (dayElapsed / daysInMonth) * 100;
    const actualPct = (networkCurrent / networkGoal) * 100;
    if (actualPct < expectedPct * 0.8) {
      messages.push("Meta mensal da rede em risco — ritmo precisa aumentar.");
    }
  }

  // Stores without sales today
  const storesNoSales = stores.filter(s => s.total_sales === 0);
  if (storesNoSales.length > 0) {
    if (storesNoSales.length === 1) {
      messages.push(`${storesNoSales[0].name} sem atendimentos hoje.`);
    } else {
      messages.push(`${storesNoSales.length} lojas sem atendimentos hoje.`);
    }
  }

  // Leading store
  const sorted = [...stores].sort((a, b) => b.total_value - a.total_value);
  if (sorted.length > 1 && sorted[0].total_value > 0) {
    messages.push(`${sorted[0].name} lidera o faturamento hoje.`);
  }

  // Stores at risk (below 70% of goal pace)
  const atRisk = stores.filter(s => {
    if (s.goal_target <= 0) return false;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayElapsed = now.getDate();
    const expectedPct = (dayElapsed / daysInMonth) * 100;
    const actualPct = (s.goal_current / s.goal_target) * 100;
    return actualPct < expectedPct * 0.7;
  });
  if (atRisk.length > 0) {
    if (atRisk.length === 1) {
      messages.push(`${atRisk[0].name} em risco de não bater a meta mensal.`);
    } else {
      messages.push(`${atRisk.length} lojas em risco de não bater a meta mensal.`);
    }
  }

  if (!messages.length) return null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Insights da Rede</span>
      </div>
      {messages.map((msg, i) => (
        <p key={i} className="text-xs text-foreground leading-relaxed">{msg}</p>
      ))}
    </div>
  );
};

export default NetworkInsights;
