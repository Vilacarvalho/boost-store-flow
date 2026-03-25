import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, ShoppingCart, BarChart3, AlertTriangle,
  Store, Users, Calculator, BookOpen, PieChart, Calendar,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import SellerGoalCards from "@/components/dashboard/SellerGoalCards";
import NetworkStoreRanking, { StoreRankingEntry } from "@/components/admin/NetworkStoreRanking";
import NetworkInsights from "@/components/admin/NetworkInsights";
import NetworkHighlights from "@/components/admin/NetworkHighlights";
import StoresAtRisk from "@/components/admin/StoresAtRisk";

interface StoreData {
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

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

const quickLinks = [
  { path: "/stores", icon: Store, label: "Lojas" },
  { path: "/users", icon: Users, label: "Usuários" },
  { path: "/goals", icon: Target, label: "Metas" },
  { path: "/goal-planner", icon: Calculator, label: "Planejador" },
  { path: "/goal-performance", icon: BarChart3, label: "Performance" },
  { path: "/conversion-analysis", icon: PieChart, label: "Conversão" },
  { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
];

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(now); mon.setDate(now.getDate() - diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange() {
  const now = new Date();
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

function daysRemaining(endStr: string) {
  const end = new Date(endStr);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

function daysElapsed(startStr: string) {
  const start = new Date(startStr);
  const now = new Date();
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000));
}

const MetricCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
  </div>
);

const AdminDashboard = () => {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  // Network goals
  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [weeklyRealized, setWeeklyRealized] = useState(0);
  const [monthlyRealized, setMonthlyRealized] = useState(0);

  // Weekly/monthly store data for ranking
  const [weeklyStores, setWeeklyStores] = useState<StoreRankingEntry[]>([]);
  const [monthlyStores, setMonthlyStores] = useState<StoreRankingEntry[]>([]);

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    loadData();
  }, [profile?.organization_id, role]);

  const loadData = async () => {
    try {
      let query = supabase.from("stores").select("id, name").eq("active", true);
      if (profile?.organization_id) query = query.eq("organization_id", profile.organization_id);

      const { data: storeList } = await query;
      if (!storeList || storeList.length === 0) { setLoading(false); return; }

      const storeMetrics: StoreData[] = [];
      const weekStoreEntries: StoreRankingEntry[] = [];
      const monthStoreEntries: StoreRankingEntry[] = [];

      // Fetch all store data in parallel
      const storePromises = storeList.map(async (store) => {
        const [metricsRes, goalRes, weekRes, monthRes] = await Promise.all([
          supabase.rpc("get_daily_metrics", { _store_id: store.id, _date: today }),
          supabase.from("goals").select("target_value, current_value").eq("store_id", store.id).is("user_id", null).eq("period_type", "monthly").order("period_start", { ascending: false }).limit(1),
          supabase.rpc("get_seller_ranking_period", { _store_id: store.id, _start_date: week.start, _end_date: week.end }),
          supabase.rpc("get_seller_ranking_period", { _store_id: store.id, _start_date: month.start, _end_date: month.end }),
        ]);

        const m = metricsRes.data?.[0];
        const goal = goalRes.data?.[0];

        const storeData: StoreData = {
          id: store.id,
          name: store.name,
          total_value: m?.total_value || 0,
          won_sales: m?.won_sales || 0,
          total_sales: m?.total_sales || 0,
          conversion_rate: m?.conversion_rate || 0,
          avg_ticket: m?.avg_ticket || 0,
          goal_target: goal?.target_value || 0,
          goal_current: goal?.current_value || 0,
        };

        const weeklyVal = (weekRes.data || []).reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const weeklyWon = (weekRes.data || []).reduce((s: number, r: any) => s + (r.won_count || 0), 0);
        const weeklyTotal = (weekRes.data || []).reduce((s: number, r: any) => s + (r.total_count || 0), 0);
        const weekConv = weeklyTotal > 0 ? (weeklyWon / weeklyTotal) * 100 : 0;
        const weekTicket = weeklyWon > 0 ? weeklyVal / weeklyWon : 0;

        const monthlyVal = (monthRes.data || []).reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const monthlyWon = (monthRes.data || []).reduce((s: number, r: any) => s + (r.won_count || 0), 0);
        const monthlyTotal = (monthRes.data || []).reduce((s: number, r: any) => s + (r.total_count || 0), 0);
        const monthConv = monthlyTotal > 0 ? (monthlyWon / monthlyTotal) * 100 : 0;
        const monthTicket = monthlyWon > 0 ? monthlyVal / monthlyWon : 0;
        const goalPct = goal?.target_value > 0 ? ((goal?.current_value || 0) / goal.target_value) * 100 : 0;

        return {
          storeData,
          weekEntry: { id: store.id, name: store.name, total_value: weeklyVal, won_sales: weeklyWon, total_sales: weeklyTotal, conversion_rate: weekConv, avg_ticket: weekTicket, goal_pct: goalPct } as StoreRankingEntry,
          monthEntry: { id: store.id, name: store.name, total_value: monthlyVal, won_sales: monthlyWon, total_sales: monthlyTotal, conversion_rate: monthConv, avg_ticket: monthTicket, goal_pct: goalPct } as StoreRankingEntry,
          weeklyVal,
          monthlyVal,
        };
      });

      const results = await Promise.all(storePromises);
      let totalWeekly = 0, totalMonthly = 0;

      for (const r of results) {
        storeMetrics.push(r.storeData);
        weekStoreEntries.push(r.weekEntry);
        monthStoreEntries.push(r.monthEntry);
        totalWeekly += r.weeklyVal;
        totalMonthly += r.monthlyVal;
      }

      setStores(storeMetrics);
      setWeeklyStores(weekStoreEntries);
      setMonthlyStores(monthStoreEntries);
      setWeeklyRealized(totalWeekly);
      setMonthlyRealized(totalMonthly);

      // Network goals
      const totalGoalTarget = storeMetrics.reduce((s, st) => s + st.goal_target, 0);
      const totalGoalCurrent = storeMetrics.reduce((s, st) => s + st.goal_current, 0);
      setMonthlyGoal(totalGoalTarget);
      setMonthlyRealized(totalMonthly > totalGoalCurrent ? totalMonthly : totalGoalCurrent);

      const resolvedWeekly = totalGoalTarget > 0 ? Math.round(totalGoalTarget / 4.33) : 0;
      const resolvedDaily = totalGoalTarget > 0 ? Math.round(totalGoalTarget / 22) : 0;
      setWeeklyGoal(resolvedWeekly);
      setDailyGoal(resolvedDaily);
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const networkValue = stores.reduce((s, st) => s + st.total_value, 0);
  const networkSales = stores.reduce((s, st) => s + st.total_sales, 0);
  const networkWon = stores.reduce((s, st) => s + st.won_sales, 0);
  const networkConversion = networkSales > 0 ? (networkWon / networkSales) * 100 : 0;
  const networkAvgTicket = networkWon > 0 ? networkValue / networkWon : 0;

  // Daily ranking entries for store ranking
  const dailyStoreRanking: StoreRankingEntry[] = stores.map(s => ({
    id: s.id,
    name: s.name,
    total_value: s.total_value,
    won_sales: s.won_sales,
    total_sales: s.total_sales,
    conversion_rate: s.conversion_rate,
    avg_ticket: s.avg_ticket,
    goal_pct: s.goal_target > 0 ? (s.goal_current / s.goal_target) * 100 : 0,
  }));

  // Goal periods for cards
  const goalPeriods = useMemo(() => {
    const weekElapsed = daysElapsed(week.start);
    const weekRemain = daysRemaining(week.end);
    const weekDailyAvg = weekElapsed > 0 ? weeklyRealized / weekElapsed : 0;
    const weekProjection = weeklyRealized + weekDailyAvg * weekRemain;

    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    const monthProjection = monthlyRealized + monthDailyAvg * monthRemain;

    return [
      { label: "Meta Diária da Rede", icon: Target, goal: dailyGoal, realized: networkValue, projection: networkValue, daysRemaining: 0 },
      { label: "Meta Semanal da Rede", icon: Calendar, goal: weeklyGoal, realized: weeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal da Rede", icon: TrendingUp, goal: monthlyGoal, realized: monthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [dailyGoal, weeklyGoal, monthlyGoal, networkValue, weeklyRealized, monthlyRealized, week, month]);

  // Monthly projection & gap
  const monthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    return monthlyRealized + monthDailyAvg * monthRemain;
  }, [monthlyRealized, month]);

  const monthGap = monthlyGoal > 0 ? monthlyGoal - monthProjection : 0;

  // Dynamic header message
  const headerMessage = useMemo(() => {
    const dailyRemaining = Math.max(0, dailyGoal - networkValue);
    if (dailyGoal > 0 && networkValue >= dailyGoal) {
      return { text: "✅ Meta diária da rede atingida!", color: "text-success" };
    }
    if (dailyGoal > 0 && dailyRemaining > 0) {
      return { text: `Faltam ${formatBRL(dailyRemaining)} para a rede bater a meta de hoje`, color: "text-muted-foreground" };
    }
    if (weeklyGoal > 0) {
      const now = new Date();
      const day = now.getDay();
      const weekDaysPassed = day === 0 ? 7 : day;
      const expectedPct = (weekDaysPassed / 7) * 100;
      const actualPct = (weeklyRealized / weeklyGoal) * 100;
      if (actualPct >= expectedPct) {
        return { text: "A rede está acima do ritmo semanal", color: "text-primary" };
      }
    }
    if (monthlyGoal > 0 && monthProjection < monthlyGoal) {
      return { text: "A meta mensal da rede está em risco", color: "text-destructive" };
    }
    if (monthlyGoal > 0 && monthProjection >= monthlyGoal) {
      return { text: "A rede já superou a meta do período", color: "text-success" };
    }
    return { text: `Visão consolidada da rede · ${stores.length} loja${stores.length !== 1 ? "s" : ""} ativa${stores.length !== 1 ? "s" : ""}`, color: "text-muted-foreground" };
  }, [dailyGoal, networkValue, weeklyGoal, weeklyRealized, monthlyGoal, monthProjection, stores.length]);

  if (loading) {
    return (
      <AppLayout>
        <div className="md:ml-64 flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 1) Header with dynamic network goal status */}
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel Administrativo</h1>
            <p className={`text-sm font-medium ${headerMessage.color}`}>{headerMessage.text}</p>
          </motion.div>

          {/* 2) Network Goal Cards — Daily / Weekly / Monthly */}
          {monthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
              <SellerGoalCards periods={goalPeriods} />
            </motion.div>
          )}

          {/* 3) Deficit / Surplus */}
          {monthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
              <div className={`rounded-2xl p-4 shadow-card border ${monthGap > 0 ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {monthGap > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {monthGap > 0 ? "Déficit estimado para atingir a meta" : "Meta será superada"}
                  </span>
                </div>
                <p className={`text-xl font-semibold tabular-nums ${monthGap > 0 ? "text-destructive" : "text-success"}`}>
                  {formatBRL(Math.abs(monthGap))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthGap > 0
                    ? "Baseado na projeção de fechamento no ritmo atual da rede"
                    : "Projeção indica que a meta mensal será superada"}
                </p>
              </div>
            </motion.div>
          )}

          {/* 5) Stores at risk */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <StoresAtRisk stores={stores} networkAvgConversion={networkConversion} />
          </motion.div>

          {/* 6) Network Insights */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
            <NetworkInsights
              stores={stores}
              networkGoal={monthlyGoal}
              networkCurrent={monthlyRealized}
              weeklyGoal={weeklyGoal}
              weeklyRealized={weeklyRealized}
            />
          </motion.div>

          {/* 7) KPIs consolidados */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores da Rede</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Faturamento Hoje" value={formatBRL(networkValue)} icon={TrendingUp} />
              <MetricCard label="Conversão" value={`${networkConversion.toFixed(1)}%`} icon={BarChart3} />
              <MetricCard label="Ticket Médio" value={formatBRL(networkAvgTicket)} icon={ShoppingCart} />
              <MetricCard label="Atendimentos" value={String(networkSales)} icon={ShoppingCart} />
            </div>
          </motion.div>

          {/* 8) Destaques da rede */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
            <NetworkHighlights stores={stores} />
          </motion.div>

          {/* 4) Store Ranking with tabs & sorts */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
            <NetworkStoreRanking
              daily={dailyStoreRanking}
              weekly={weeklyStores}
              monthly={monthlyStores}
            />
          </motion.div>

          {/* Quick Links */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.22 }} className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acessos Rápidos</h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-card hover:bg-accent/50 transition-colors"
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">{link.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Empty state */}
          {stores.length === 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2">
              <Store className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma loja ativa na rede.</p>
              <p className="text-xs text-muted-foreground">Cadastre lojas para começar.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
