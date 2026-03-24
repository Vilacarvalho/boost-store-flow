import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, BarChart3, TrendingUp } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import SellerRankingTabs, { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import StoreProjection from "@/components/manager/StoreProjection";
import TeamHighlights from "@/components/manager/TeamHighlights";
import TeamAlerts from "@/components/manager/TeamAlerts";

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

const ManagerDashboard = () => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dailyRanking, setDailyRanking] = useState<RankingEntry[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [monthlyRanking, setMonthlyRanking] = useState<RankingEntry[]>([]);
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalCurrent, setGoalCurrent] = useState(0);
  const [goalAchievement, setGoalAchievement] = useState<Record<string, { pct: number }>>({});
  const [loading, setLoading] = useState(true);

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  useEffect(() => {
    if (!user || !profile?.store_id) { setLoading(false); return; }
    loadData();
  }, [profile?.store_id, user]);

  const loadData = async () => {
    const storeId = profile!.store_id!;

    const [metricsRes, dailyRes, weeklyRes, monthlyRes, goalRes] = await Promise.all([
      supabase.rpc("get_daily_metrics", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: week.start, _end_date: week.end }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: month.start, _end_date: month.end }),
      supabase.from("goals").select("target_value, current_value").eq("store_id", storeId).is("user_id", null).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).order("created_at", { ascending: false }).limit(1),
    ]);

    if (metricsRes.data?.[0]) setMetrics(metricsRes.data[0] as Metrics);
    else setMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });

    if (dailyRes.data) setDailyRanking(dailyRes.data as RankingEntry[]);
    if (weeklyRes.data) setWeeklyRanking(weeklyRes.data as RankingEntry[]);
    if (monthlyRes.data) setMonthlyRanking(monthlyRes.data as RankingEntry[]);

    const goal = goalRes.data?.[0];
    if (goal) { setGoalTarget(goal.target_value); setGoalCurrent(goal.current_value); }

    // Goal achievement for ranking
    if (monthlyRes.data && goal) {
      const { data: allGoals } = await supabase.from("goals").select("user_id, target_value").eq("store_id", storeId).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).not("user_id", "is", null);
      const goalMap: Record<string, number> = {};
      (allGoals || []).forEach((g: any) => { goalMap[g.user_id] = g.target_value; });
      const achievement: Record<string, { pct: number }> = {};
      (monthlyRes.data as RankingEntry[]).forEach((s) => {
        const g = goalMap[s.seller_id] || goal.target_value;
        achievement[s.seller_id] = { pct: g > 0 ? (s.total_value / g) * 100 : 0 };
      });
      setGoalAchievement(achievement);
    }

    setLoading(false);
  };

  // Compute store averages for alerts
  const storeAvgConversion = dailyRanking.length > 0 ? dailyRanking.reduce((s, r) => s + r.conversion_rate, 0) / dailyRanking.length : 0;
  const storeAvgTicket = dailyRanking.length > 0 ? dailyRanking.reduce((s, r) => s + (r.avg_ticket || 0), 0) / dailyRanking.length : 0;
  const eligibleCount = dailyRanking.length || 1;
  const dailyGoalPerSeller = goalTarget > 0 ? goalTarget / 22 / eligibleCount : 0;

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
          {/* Header */}
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel do Gerente</h1>
            <p className="text-sm text-muted-foreground">Desempenho da sua loja hoje</p>
          </motion.div>

          {/* Store Projection */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
            <StoreProjection goalTarget={goalTarget} goalCurrent={goalCurrent} />
          </motion.div>

          {/* KPI Grid */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{formatBRL(metrics?.total_value || 0)}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversão</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{metrics?.conversion_rate || 0}%</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{formatBRL(metrics?.avg_ticket || 0)}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">P.A. Médio</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{(metrics?.avg_pa || 0).toFixed(1)}</p>
            </div>
          </motion.div>

          {/* Team Highlights */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <TeamHighlights dailyRanking={dailyRanking} />
          </motion.div>

          {/* Team Alerts */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
            <TeamAlerts
              dailyRanking={dailyRanking}
              dailyGoal={dailyGoalPerSeller}
              storeAvgConversion={storeAvgConversion}
              storeAvgTicket={storeAvgTicket}
            />
          </motion.div>

          {/* Team Ranking */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
            <SellerRankingTabs
              daily={dailyRanking}
              weekly={weeklyRanking}
              monthly={monthlyRanking}
              currentUserId={user?.id || ""}
              goalAchievement={goalAchievement}
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
