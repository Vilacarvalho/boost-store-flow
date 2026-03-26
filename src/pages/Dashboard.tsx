import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Target, ShoppingCart, BarChart3, AlertTriangle, Heart, Calendar } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import { useCulture } from "@/hooks/useCulture";
import SellerGoalCards from "@/components/dashboard/SellerGoalCards";
import SellerRankingTabs, { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import QuickRankingSummary from "@/components/dashboard/QuickRankingSummary";
import ContextualMessages from "@/components/dashboard/ContextualMessages";
import DailyPriority from "@/components/dashboard/DailyPriority";
import MetaRiskIndicator from "@/components/dashboard/MetaRiskIndicator";
import RequiredVelocity from "@/components/dashboard/RequiredVelocity";
import TurnQueue from "@/components/turn-queue/TurnQueue";

interface Metrics {
  total_sales: number;
  won_sales: number;
  total_value: number;
  avg_ticket: number;
  conversion_rate: number;
  total_attendances: number;
  avg_pa: number;
}

interface LostSale {
  customer_name: string;
  objection_reason: string;
  created_at: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

const MetricCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
  </div>
);

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

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

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

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { data: culture } = useCulture();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [loading, setLoading] = useState(true);

  const [dailyRanking, setDailyRanking] = useState<RankingEntry[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [monthlyRanking, setMonthlyRanking] = useState<RankingEntry[]>([]);

  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [weeklyRealized, setWeeklyRealized] = useState(0);
  const [monthlyRealized, setMonthlyRealized] = useState(0);

  const [goalAchievement, setGoalAchievement] = useState<Record<string, { pct: number }>>({});

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  useEffect(() => {
    if (!user || !profile?.store_id) {
      setLoading(false);
      setMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });
      return;
    }

    const storeId = profile.store_id!;
    const userId = user.id;

    const fetchAll = async () => {
      setLoading(true);

      const [metricsRes, dailyRankRes, weeklyRankRes, monthlyRankRes, lostRes] = await Promise.all([
        supabase.rpc("get_daily_metrics", { _store_id: storeId }),
        supabase.rpc("get_seller_ranking", { _store_id: storeId }),
        supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: week.start, _end_date: week.end }),
        supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: month.start, _end_date: month.end }),
        supabase.from("sales").select("objection_reason, created_at, customers(name)").eq("store_id", storeId).eq("status", "lost").gte("created_at", today).order("created_at", { ascending: false }).limit(5),
      ]);

      if (metricsRes.data?.length) setMetrics(metricsRes.data[0] as Metrics);
      else setMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });

      if (dailyRankRes.data) setDailyRanking(dailyRankRes.data as RankingEntry[]);
      if (weeklyRankRes.data) setWeeklyRanking(weeklyRankRes.data as RankingEntry[]);
      if (monthlyRankRes.data) setMonthlyRanking(monthlyRankRes.data as RankingEntry[]);

      const myWeekly = (weeklyRankRes.data as RankingEntry[] || []).find(r => r.seller_id === userId);
      const myMonthly = (monthlyRankRes.data as RankingEntry[] || []).find(r => r.seller_id === userId);
      setWeeklyRealized(myWeekly?.total_value || 0);
      setMonthlyRealized(myMonthly?.total_value || 0);

      if (lostRes.data) {
        setLostSales(lostRes.data.map((s: any) => ({
          customer_name: s.customers?.name || "Cliente",
          objection_reason: s.objection_reason || "Não informado",
          created_at: s.created_at,
        })));
      }

      const [userDailyGoal, userWeeklyGoal, userMonthlyGoal, storeDailyGoal, storeWeeklyGoal, storeMonthlyGoal] = await Promise.all([
        supabase.from("goals").select("target_value").eq("user_id", userId).lte("start_date", today).gte("end_date", today).eq("period_type", "daily").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("goals").select("target_value").eq("user_id", userId).lte("start_date", week.start).gte("end_date", week.end).eq("period_type", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("goals").select("target_value").eq("user_id", userId).lte("start_date", month.start).gte("end_date", month.end).eq("period_type", "monthly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", today).gte("end_date", today).eq("period_type", "daily").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", week.start).gte("end_date", week.end).eq("period_type", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", month.start).gte("end_date", month.end).eq("period_type", "monthly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const resolvedMonthly = userMonthlyGoal.data?.target_value || storeMonthlyGoal.data?.target_value || 0;
      const resolvedWeekly = userWeeklyGoal.data?.target_value || storeWeeklyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 4.33) : 0);
      const resolvedDaily = userDailyGoal.data?.target_value || storeDailyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 22) : 5000);

      setDailyGoal(resolvedDaily);
      setWeeklyGoal(resolvedWeekly);
      setMonthlyGoal(resolvedMonthly);

      if (monthlyRankRes.data && resolvedMonthly > 0) {
        const achievement: Record<string, { pct: number }> = {};
        const { data: allGoals } = await supabase
          .from("goals").select("user_id, target_value").eq("store_id", storeId)
          .eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).not("user_id", "is", null);
        const goalMap: Record<string, number> = {};
        (allGoals || []).forEach((g: any) => { goalMap[g.user_id] = g.target_value; });
        (monthlyRankRes.data as RankingEntry[]).forEach((s) => {
          const g = goalMap[s.seller_id] || resolvedMonthly;
          achievement[s.seller_id] = { pct: g > 0 ? (s.total_value / g) * 100 : 0 };
        });
        setGoalAchievement(achievement);
      }

      setLoading(false);
    };

    fetchAll();
  }, [profile?.store_id, user]);

  const totalValue = metrics?.total_value || 0;
  const remaining = Math.max(0, dailyGoal - totalValue);
  const userName = profile?.name?.split(" ")[0] || "Vendedor";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Goal periods for cards
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
      { label: "Meta Diária", icon: Target, goal: dailyGoal, realized: totalValue, projection: dailyProjection, daysRemaining: 0 },
      { label: "Meta Semanal", icon: Calendar, goal: weeklyGoal, realized: weeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal", icon: TrendingUp, goal: monthlyGoal, realized: monthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [dailyGoal, weeklyGoal, monthlyGoal, totalValue, weeklyRealized, monthlyRealized, week, month]);

  // Monthly projection
  const monthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    return monthlyRealized + monthDailyAvg * monthRemain;
  }, [monthlyRealized, month]);

  const monthGap = monthlyGoal > 0 ? monthlyGoal - monthProjection : 0;
  const monthRemain = daysRemaining(month.end);

  // Daily priority message
  const dailyPriority = useMemo(() => {
    if (dailyGoal > 0 && remaining > 0) {
      return { message: `Faltam ${formatBRL(remaining)} para sua meta de hoje`, severity: remaining > dailyGoal * 0.5 ? "critical" as const : "warning" as const };
    }
    if (dailyGoal > 0 && totalValue >= dailyGoal) {
      return { message: "Meta do dia atingida! Continue vendendo para superar", severity: "info" as const };
    }
    return { message: "Inicie um atendimento para começar o dia", severity: "info" as const };
  }, [dailyGoal, remaining, totalValue]);

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
          {/* 1) Header with dynamic status */}
          <motion.div {...fadeUp} className="space-y-1">
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{userName} 👋</h1>
            {remaining > 0 ? (
              <p className="text-sm text-muted-foreground">
                Você está a <span className="font-semibold text-primary tabular-nums">{formatBRL(remaining)}</span> da sua meta do dia.
              </p>
            ) : totalValue > 0 ? (
              <p className="text-sm text-success font-medium">🎉 Meta do dia atingida!</p>
            ) : (
              <p className="text-sm text-muted-foreground">Inicie um atendimento para começar o dia.</p>
            )}
          </motion.div>

          {/* 2) Prioridade do Dia */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.03 }}>
            <DailyPriority message={dailyPriority.message} severity={dailyPriority.severity} />
          </motion.div>

          {/* 3) Quick Ranking Summary */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
            <QuickRankingSummary dailyRanking={dailyRanking} currentUserId={user?.id || ""} />
          </motion.div>

          {/* 4) Goal Cards */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
            <SellerGoalCards periods={goalPeriods} />
          </motion.div>

          {/* 5) Risco de Meta + Velocidade Necessária */}
          {monthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.09 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetaRiskIndicator
                goal={monthlyGoal}
                realized={monthlyRealized}
                projection={monthProjection}
                daysRemaining={monthRemain}
              />
              <RequiredVelocity
                goal={monthlyGoal}
                realized={monthlyRealized}
                daysRemaining={monthRemain}
              />
            </motion.div>
          )}

          {/* 6) Déficit / Superávit */}
          {monthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              <div className={`rounded-2xl p-4 shadow-card border ${monthGap > 0 ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {monthGap > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {monthGap > 0 ? "Déficit estimado" : "Meta será superada"}
                  </span>
                </div>
                <p className={`text-xl font-semibold tabular-nums ${monthGap > 0 ? "text-destructive" : "text-success"}`}>
                  {formatBRL(Math.abs(monthGap))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthGap > 0 ? "Baseado na projeção no ritmo atual" : "Projeção indica que a meta será superada"}
                </p>
              </div>
            </motion.div>
          )}

          {/* 7) Contextual Messages / Insights */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
            <ContextualMessages
              dailyRanking={dailyRanking}
              currentUserId={user?.id || ""}
              dailyGoal={dailyGoal}
              dailyRealized={totalValue}
            />
          </motion.div>

          {/* 8) KPIs Operacionais */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores Operacionais</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Vendas" value={(metrics?.won_sales || 0).toString()} icon={ShoppingCart} />
              <MetricCard label="Conversão" value={`${metrics?.conversion_rate || 0}%`} icon={BarChart3} />
              <MetricCard label="Ticket Médio" value={formatBRL(metrics?.avg_ticket || 0)} icon={TrendingUp} />
              <MetricCard label="P.A. Médio" value={(metrics?.avg_pa || 0).toFixed(1)} icon={ShoppingCart} />
            </div>
          </motion.div>

          {/* 9) Rankings */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.17 }}>
            <SellerRankingTabs
              daily={dailyRanking}
              weekly={weeklyRanking}
              monthly={monthlyRanking}
              currentUserId={user?.id || ""}
              goalAchievement={goalAchievement}
            />
          </motion.div>

          {/* 10) Lost Attendances */}
          {lostSales.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendimentos Perdidos</h2>
              <div className="space-y-2">
                {lostSales.map((att, i) => (
                  <div key={i} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{att.customer_name}</p>
                      <p className="text-xs text-muted-foreground">Motivo: {att.objection_reason}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(att.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Culture */}
          {culture?.mission && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }} className="bg-card rounded-2xl p-4 shadow-card cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/culture")}>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nossa Missão</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-2">{culture.mission}</p>
            </motion.div>
          )}

          {/* Empty state */}
          {(metrics?.total_attendances || 0) === 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum atendimento hoje ainda.</p>
              <p className="text-xs text-muted-foreground">Toque no botão + para iniciar.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
