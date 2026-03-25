import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, BarChart3, TrendingUp, Target, Calendar, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import SellerRankingTabs, { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import SellerGoalCards from "@/components/dashboard/SellerGoalCards";
import TeamHighlights from "@/components/manager/TeamHighlights";
import TeamAlerts from "@/components/manager/TeamAlerts";
import StoreInsights from "@/components/manager/StoreInsights";
import StoreActionPlans from "@/components/supervisor/StoreActionPlans";

interface Metrics {
  total_sales: number;
  won_sales: number;
  total_value: number;
  avg_ticket: number;
  conversion_rate: number;
  total_attendances: number;
  avg_pa: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

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

const ManagerDashboard = () => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dailyRanking, setDailyRanking] = useState<RankingEntry[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [monthlyRanking, setMonthlyRanking] = useState<RankingEntry[]>([]);
  const [goalAchievement, setGoalAchievement] = useState<Record<string, { pct: number }>>({});
  const [loading, setLoading] = useState(true);

  // Store goals
  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [weeklyRealized, setWeeklyRealized] = useState(0);
  const [monthlyRealized, setMonthlyRealized] = useState(0);

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  useEffect(() => {
    if (!user || !profile?.store_id) { setLoading(false); return; }
    loadData();
  }, [profile?.store_id, user]);

  const loadData = async () => {
    const storeId = profile!.store_id!;

    const [metricsRes, dailyRes, weeklyRes, monthlyRes, storeDailyGoal, storeWeeklyGoal, storeMonthlyGoal] = await Promise.all([
      supabase.rpc("get_daily_metrics", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: week.start, _end_date: week.end }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: month.start, _end_date: month.end }),
      supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", today).gte("end_date", today).eq("period_type", "daily").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", week.start).gte("end_date", week.end).eq("period_type", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("goals").select("target_value, current_value").eq("store_id", storeId).is("user_id", null).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (metricsRes.data?.[0]) setMetrics(metricsRes.data[0] as Metrics);
    else setMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });

    if (dailyRes.data) setDailyRanking(dailyRes.data as RankingEntry[]);
    if (weeklyRes.data) setWeeklyRanking(weeklyRes.data as RankingEntry[]);
    if (monthlyRes.data) setMonthlyRanking(monthlyRes.data as RankingEntry[]);

    // Store-level realized values
    const storeWeeklyRealized = (weeklyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    const storeMonthlyRealized = (monthlyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    setWeeklyRealized(storeWeeklyRealized);
    setMonthlyRealized(storeMonthlyRealized);

    // Resolve store goals with fallback from monthly
    const resolvedMonthly = storeMonthlyGoal.data?.target_value || 0;
    const resolvedWeekly = storeWeeklyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 4.33) : 0);
    const resolvedDaily = storeDailyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 22) : 0);

    setDailyGoal(resolvedDaily);
    setWeeklyGoal(resolvedWeekly);
    setMonthlyGoal(resolvedMonthly);

    // Goal achievement for ranking
    if (monthlyRes.data && resolvedMonthly > 0) {
      const { data: allGoals } = await supabase.from("goals").select("user_id, target_value").eq("store_id", storeId).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).not("user_id", "is", null);
      const goalMap: Record<string, number> = {};
      (allGoals || []).forEach((g: any) => { goalMap[g.user_id] = g.target_value; });
      const achievement: Record<string, { pct: number }> = {};
      (monthlyRes.data as RankingEntry[]).forEach((s) => {
        const g = goalMap[s.seller_id] || resolvedMonthly;
        achievement[s.seller_id] = { pct: g > 0 ? (s.total_value / g) * 100 : 0 };
      });
      setGoalAchievement(achievement);
    }

    setLoading(false);
  };

  const totalValue = metrics?.total_value || 0;
  const dailyRemaining = Math.max(0, dailyGoal - totalValue);
  const storeName = "Loja";

  // Compute store averages for alerts
  const storeAvgConversion = dailyRanking.length > 0 ? dailyRanking.reduce((s, r) => s + r.conversion_rate, 0) / dailyRanking.length : 0;
  const storeAvgTicket = dailyRanking.length > 0 ? dailyRanking.reduce((s, r) => s + (r.avg_ticket || 0), 0) / dailyRanking.length : 0;
  const eligibleCount = dailyRanking.length || 1;
  const dailyGoalPerSeller = dailyGoal > 0 ? dailyGoal / eligibleCount : 0;

  // Goal periods for cards (store-level)
  const goalPeriods = useMemo(() => {
    const dailyProjection = totalValue;

    const weekElapsed = daysElapsed(week.start);
    const weekRemain = daysRemaining(week.end);
    const weekDailyAvg = weekElapsed > 0 ? weeklyRealized / weekElapsed : 0;
    const weekProjection = weeklyRealized + weekDailyAvg * weekRemain;

    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    const monthProjection = monthlyRealized + monthDailyAvg * monthRemain;

    return [
      { label: "Meta Diária da Loja", icon: Target, goal: dailyGoal, realized: totalValue, projection: dailyProjection, daysRemaining: 0 },
      { label: "Meta Semanal da Loja", icon: Calendar, goal: weeklyGoal, realized: weeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal da Loja", icon: TrendingUp, goal: monthlyGoal, realized: monthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [dailyGoal, weeklyGoal, monthlyGoal, totalValue, weeklyRealized, monthlyRealized, week, month]);

  // Deficit / surplus for monthly
  const monthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    return monthlyRealized + monthDailyAvg * monthRemain;
  }, [monthlyRealized, month]);

  const monthGap = monthlyGoal > 0 ? monthlyGoal - monthProjection : 0;

  // Dynamic header message
  const headerMessage = useMemo(() => {
    if (dailyGoal > 0 && totalValue >= dailyGoal) {
      return { text: "✅ Meta diária da loja atingida!", color: "text-success" };
    }
    if (dailyGoal > 0 && dailyRemaining > 0) {
      return { text: `Faltam ${formatBRL(dailyRemaining)} para a loja bater a meta de hoje`, color: "text-muted-foreground" };
    }
    if (weeklyGoal > 0) {
      const now = new Date();
      const day = now.getDay();
      const weekDaysPassed = day === 0 ? 7 : day;
      const expectedPct = (weekDaysPassed / 7) * 100;
      const actualPct = (weeklyRealized / weeklyGoal) * 100;
      if (actualPct >= expectedPct) {
        return { text: "A loja está acima do ritmo semanal", color: "text-primary" };
      }
    }
    if (monthlyGoal > 0 && monthProjection < monthlyGoal) {
      return { text: "A loja está abaixo do ritmo mensal", color: "text-destructive" };
    }
    return { text: "Acompanhe o desempenho da loja", color: "text-muted-foreground" };
  }, [dailyGoal, totalValue, dailyRemaining, weeklyGoal, weeklyRealized, monthlyGoal, monthProjection]);

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
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* 1) Header with dynamic store goal status */}
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel do Gerente</h1>
            <p className={`text-sm font-medium ${headerMessage.color}`}>{headerMessage.text}</p>
          </motion.div>

          {/* 2) Store Goal Cards — Daily / Weekly / Monthly */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
            <SellerGoalCards periods={goalPeriods} />
          </motion.div>

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
                    ? "Baseado na projeção de fechamento no ritmo atual da loja"
                    : "Projeção indica que a meta mensal será superada"}
                </p>
              </div>
            </motion.div>
          )}

          {/* 4) Store Insights */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <StoreInsights
              dailyRanking={dailyRanking}
              storeMetrics={{
                total_value: totalValue,
                conversion_rate: metrics?.conversion_rate || 0,
                avg_ticket: metrics?.avg_ticket || 0,
                total_attendances: metrics?.total_attendances || 0,
              }}
              dailyGoal={dailyGoal}
              weeklyGoal={weeklyGoal}
              weeklyRealized={weeklyRealized}
              monthlyGoal={monthlyGoal}
              monthlyRealized={monthlyRealized}
            />
          </motion.div>

          {/* 5) KPIs operacionais */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores Operacionais</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Faturamento" value={formatBRL(metrics?.total_value || 0)} icon={TrendingUp} />
              <MetricCard label="Conversão" value={`${metrics?.conversion_rate || 0}%`} icon={BarChart3} />
              <MetricCard label="Ticket Médio" value={formatBRL(metrics?.avg_ticket || 0)} icon={ShoppingCart} />
              <MetricCard label="P.A. Médio" value={(metrics?.avg_pa || 0).toFixed(1)} icon={ShoppingCart} />
            </div>
          </motion.div>

          {/* 6) Destaques do dia */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
            <TeamHighlights dailyRanking={dailyRanking} />
          </motion.div>

          {/* Team Alerts */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
            <TeamAlerts
              dailyRanking={dailyRanking}
              dailyGoal={dailyGoalPerSeller}
              storeAvgConversion={storeAvgConversion}
              storeAvgTicket={storeAvgTicket}
            />
          </motion.div>

          {/* 7) Ranking da equipe */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
            <SellerRankingTabs
              daily={dailyRanking}
              weekly={weeklyRanking}
              monthly={monthlyRanking}
              currentUserId={user?.id || ""}
              goalAchievement={goalAchievement}
            />
          </motion.div>

          {/* 8) Planos de ação */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
            <StoreActionPlans
              stores={[{ id: profile?.store_id || "", name: "" }]}
              readOnly
              storeFilter={profile?.store_id || ""}
            />
          </motion.div>

          {/* Empty state */}
          {(metrics?.total_attendances || 0) === 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum atendimento hoje ainda.</p>
              <p className="text-xs text-muted-foreground">Acompanhe a equipe para iniciar.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ManagerDashboard;
