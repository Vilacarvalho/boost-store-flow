import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import { VisitAgenda } from "@/components/supervisor/VisitAgenda";
import { VisitHistory } from "@/components/supervisor/VisitHistory";
import SupervisorStoreRanking, { StoreRankingEntry } from "@/components/supervisor/SupervisorStoreRanking";
import SupervisorStoreAlerts from "@/components/supervisor/SupervisorStoreAlerts";
import SupervisorHighlights from "@/components/supervisor/SupervisorHighlights";
import SupervisorPendingActions, { PendingAction } from "@/components/supervisor/SupervisorPendingActions";
import StoreActionPlans, { CreateActionPayload } from "@/components/supervisor/StoreActionPlans";
import DailyPriority from "@/components/dashboard/DailyPriority";
import MetaRiskIndicator from "@/components/dashboard/MetaRiskIndicator";
import RequiredVelocity from "@/components/dashboard/RequiredVelocity";
import SellerGoalCards from "@/components/dashboard/SellerGoalCards";
import SellerRankingTabs, { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import DashboardScopeSelector from "@/components/dashboard/DashboardScopeSelector";
import StoreInsights from "@/components/manager/StoreInsights";
import TeamHighlights from "@/components/manager/TeamHighlights";
import TeamAlerts from "@/components/manager/TeamAlerts";
import { CalendarDays, BarChart3, ClipboardList, Target, Calendar, TrendingUp, AlertTriangle, ShoppingCart } from "lucide-react";

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

interface StoreMetrics {
  total_sales: number;
  won_sales: number;
  total_value: number;
  avg_ticket: number;
  conversion_rate: number;
  total_attendances: number;
  avg_pa: number;
}

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

const SCOPE_KEY = "dashboard_scope_selected_supervisor";

const SupervisorDashboard = () => {
  const { profile, user } = useAuth();

  // Scope
  const [selectedScope, setSelectedScope] = useState<string>(() => {
    return localStorage.getItem(SCOPE_KEY) || "network";
  });

  const [dailyStores, setDailyStores] = useState<StoreRankingEntry[]>([]);
  const [weeklyStores, setWeeklyStores] = useState<StoreRankingEntry[]>([]);
  const [monthlyStores, setMonthlyStores] = useState<StoreRankingEntry[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [pendingChecklistCount, setPendingChecklistCount] = useState(0);
  const [storesWithoutRecentVisit, setStoresWithoutRecentVisit] = useState<{ id: string; name: string }[]>([]);
  const [storeList, setStoreList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionTrigger, setActionTrigger] = useState(0);
  const [actionPayload, setActionPayload] = useState<CreateActionPayload | undefined>();

  // Network-level goals
  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [dailyRealized, setDailyRealized] = useState(0);
  const [weeklyRealized, setWeeklyRealized] = useState(0);
  const [monthlyRealized, setMonthlyRealized] = useState(0);

  // Store-level state
  const [storeMetricsData, setStoreMetricsData] = useState<StoreMetrics | null>(null);
  const [storeDailyRanking, setStoreDailyRanking] = useState<RankingEntry[]>([]);
  const [storeWeeklyRanking, setStoreWeeklyRanking] = useState<RankingEntry[]>([]);
  const [storeMonthlyRanking, setStoreMonthlyRanking] = useState<RankingEntry[]>([]);
  const [storeGoalAchievement, setStoreGoalAchievement] = useState<Record<string, { pct: number }>>({});
  const [sStoreDailyGoal, setSStoreDailyGoal] = useState(0);
  const [sStoreWeeklyGoal, setSStoreWeeklyGoal] = useState(0);
  const [sStoreMonthlyGoal, setSStoreMonthlyGoal] = useState(0);
  const [sStoreWeeklyRealized, setSStoreWeeklyRealized] = useState(0);
  const [sStoreMonthlyRealized, setSStoreMonthlyRealized] = useState(0);

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  const isStoreView = selectedScope !== "network";
  const selectedStoreName = storeList.find(s => s.id === selectedScope)?.name || "";

  const handleScopeChange = useCallback((scope: string) => {
    setSelectedScope(scope);
    localStorage.setItem(SCOPE_KEY, scope);
  }, []);

  // Validate persisted scope
  useEffect(() => {
    if (storeList.length > 0 && selectedScope !== "network") {
      if (!storeList.find(s => s.id === selectedScope)) {
        handleScopeChange("network");
      }
    }
  }, [storeList, selectedScope, handleScopeChange]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadData();
  }, [profile?.organization_id]);

  const loadData = async () => {
    try {
      const orgId = profile!.organization_id!;

      const { data: stores } = await supabase
        .from("stores").select("id, name")
        .eq("organization_id", orgId).eq("active", true);

      if (!stores || stores.length === 0) { setLoading(false); return; }
      setStoreList(stores);

      const [dailyMetrics, monthGoals, visitsRes, allActionsRes] = await Promise.all([
        Promise.all(stores.map(s => supabase.rpc("get_daily_metrics", { _store_id: s.id }))),
        supabase.from("goals").select("store_id, target_value, current_value")
          .eq("organization_id", orgId).is("user_id", null)
          .eq("period_type", "monthly")
          .lte("start_date", month.start).gte("end_date", month.end),
        supabase.from("store_visits").select("id, store_id, visit_date").order("visit_date", { ascending: false }),
        supabase.from("visit_actions").select("id, visit_id, issue, action, responsible, due_date, status").neq("status", "done"),
      ]);

      const weeklyMetrics = await Promise.all(stores.map(s =>
        supabase.rpc("get_seller_ranking_period", { _store_id: s.id, _start_date: week.start, _end_date: week.end })
      ));
      const monthlyMetrics = await Promise.all(stores.map(s =>
        supabase.rpc("get_seller_ranking_period", { _store_id: s.id, _start_date: month.start, _end_date: month.end })
      ));

      const goalMap: Record<string, { target: number; current: number }> = {};
      (monthGoals.data || []).forEach((g: any) => {
        if (g.store_id) goalMap[g.store_id] = { target: g.target_value, current: g.current_value };
      });

      const buildEntry = (store: { id: string; name: string }, tv: number, ws: number, ts: number, cr: number, at: number): StoreRankingEntry => {
        const goal = goalMap[store.id];
        return {
          store_id: store.id, store_name: store.name,
          total_value: tv, won_sales: ws, total_sales: ts,
          conversion_rate: cr, avg_ticket: at,
          goal_target: goal?.target || 0, goal_current: goal?.current || 0,
          goal_pct: goal && goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0,
        };
      };

      const daily = stores.map((s, i) => {
        const m = dailyMetrics[i].data?.[0];
        return buildEntry(s, m?.total_value || 0, m?.won_sales || 0, m?.total_sales || 0, m?.conversion_rate || 0, m?.avg_ticket || 0);
      });

      const agg = (data: any[]) => {
        let tv = 0, wc = 0, tc = 0;
        (data || []).forEach((r: any) => { tv += Number(r.total_value); wc += Number(r.won_count); tc += Number(r.total_count); });
        return { tv, wc, tc, conv: tc > 0 ? Math.round((wc / tc) * 1000) / 10 : 0, ticket: wc > 0 ? tv / wc : 0 };
      };

      const wk = stores.map((s, i) => { const a = agg(weeklyMetrics[i].data); return buildEntry(s, a.tv, a.wc, a.tc, a.conv, a.ticket); });
      const mo = stores.map((s, i) => { const a = agg(monthlyMetrics[i].data); return buildEntry(s, a.tv, a.wc, a.tc, a.conv, a.ticket); });

      setDailyStores(daily);
      setWeeklyStores(wk);
      setMonthlyStores(mo);

      const totalMonthlyGoal = Object.values(goalMap).reduce((s, g) => s + g.target, 0);
      const totalDailyRealized = daily.reduce((s, d) => s + d.total_value, 0);
      const totalWeeklyRealized = wk.reduce((s, d) => s + d.total_value, 0);
      const totalMonthlyRealized = mo.reduce((s, d) => s + d.total_value, 0);

      setMonthlyGoal(totalMonthlyGoal);
      setWeeklyGoal(totalMonthlyGoal > 0 ? Math.round(totalMonthlyGoal / 4.33) : 0);
      setDailyGoal(totalMonthlyGoal > 0 ? Math.round(totalMonthlyGoal / 22) : 0);
      setDailyRealized(totalDailyRealized);
      setWeeklyRealized(totalWeeklyRealized);
      setMonthlyRealized(totalMonthlyRealized);

      // Visit pending actions
      const visitData = visitsRes.data || [];
      const visitMap: Record<string, { store_id: string; visit_date: string }> = {};
      visitData.forEach((v: any) => { visitMap[v.id] = { store_id: v.store_id, visit_date: v.visit_date }; });
      const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));

      setPendingActions(
        (allActionsRes.data || []).map((a: any) => {
          const visit = visitMap[a.visit_id];
          return { ...a, store_name: visit ? storeMap[visit.store_id] || "—" : "—", visit_date: visit?.visit_date || "" };
        }).filter((a: PendingAction) => a.store_name !== "—")
      );

      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
      const cutoffStr = fmt(cutoff);
      const visited = new Set(visitData.filter((v: any) => v.visit_date >= cutoffStr).map((v: any) => v.store_id));
      setStoresWithoutRecentVisit(stores.filter(s => !visited.has(s.id)));

      const vIds = visitData.map((v: any) => v.id);
      if (vIds.length > 0) {
        const { data: cls } = await supabase.from("visit_checklists").select("visit_id").in("visit_id", vIds.slice(0, 50));
        const clIds = new Set((cls || []).map((c: any) => c.visit_id));
        setPendingChecklistCount(visitData.filter((v: any) => v.visit_date <= today && !clIds.has(v.id)).length);
      }
    } catch (err) {
      console.error("Error loading supervisor data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load store-level data
  useEffect(() => {
    if (!isStoreView || !selectedScope) return;
    loadStoreData(selectedScope);
  }, [selectedScope, isStoreView]);

  const loadStoreData = async (storeId: string) => {
    const [metricsRes, dailyRes, weeklyRes, monthlyRes, sDailyGoal, sWeeklyGoal, sMonthlyGoal] = await Promise.all([
      supabase.rpc("get_daily_metrics", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking", { _store_id: storeId }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: week.start, _end_date: week.end }),
      supabase.rpc("get_seller_ranking_period", { _store_id: storeId, _start_date: month.start, _end_date: month.end }),
      supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", today).gte("end_date", today).eq("period_type", "daily").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("goals").select("target_value").eq("store_id", storeId).is("user_id", null).lte("start_date", week.start).gte("end_date", week.end).eq("period_type", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("goals").select("target_value, current_value").eq("store_id", storeId).is("user_id", null).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (metricsRes.data?.[0]) setStoreMetricsData(metricsRes.data[0] as StoreMetrics);
    else setStoreMetricsData({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });

    if (dailyRes.data) setStoreDailyRanking(dailyRes.data as RankingEntry[]);
    if (weeklyRes.data) setStoreWeeklyRanking(weeklyRes.data as RankingEntry[]);
    if (monthlyRes.data) setStoreMonthlyRanking(monthlyRes.data as RankingEntry[]);

    const sWeekRealized = (weeklyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    const sMonthRealized = (monthlyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    setSStoreWeeklyRealized(sWeekRealized);
    setSStoreMonthlyRealized(sMonthRealized);

    const resolvedMonthly = sMonthlyGoal.data?.target_value || 0;
    const resolvedWeekly = sWeeklyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 4.33) : 0);
    const resolvedDaily = sDailyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 22) : 0);

    setSStoreDailyGoal(resolvedDaily);
    setSStoreWeeklyGoal(resolvedWeekly);
    setSStoreMonthlyGoal(resolvedMonthly);

    if (monthlyRes.data && resolvedMonthly > 0) {
      const { data: allGoals } = await supabase.from("goals").select("user_id, target_value").eq("store_id", storeId).eq("period_type", "monthly").lte("start_date", month.start).gte("end_date", month.end).not("user_id", "is", null);
      const goalMap: Record<string, number> = {};
      (allGoals || []).forEach((g: any) => { goalMap[g.user_id] = g.target_value; });
      const achievement: Record<string, { pct: number }> = {};
      (monthlyRes.data as RankingEntry[]).forEach((s) => {
        const g = goalMap[s.seller_id] || resolvedMonthly;
        achievement[s.seller_id] = { pct: g > 0 ? (s.total_value / g) * 100 : 0 };
      });
      setStoreGoalAchievement(achievement);
    }
  };

  const netConv = monthlyStores.length > 0 ? monthlyStores.reduce((s, st) => s + st.conversion_rate, 0) / monthlyStores.length : 0;
  const netTicket = monthlyStores.length > 0
    ? monthlyStores.filter(s => s.won_sales > 0).reduce((s, st) => s + st.avg_ticket, 0) / (monthlyStores.filter(s => s.won_sales > 0).length || 1) : 0;

  const handleCreateFromAlert = (payload: CreateActionPayload) => {
    setActionPayload(payload);
    setActionTrigger(t => t + 1);
  };

  // ── Network goal periods ──
  const networkGoalPeriods = useMemo(() => {
    const weekElapsed = daysElapsed(week.start);
    const weekRemain = daysRemaining(week.end);
    const weekDailyAvg = weekElapsed > 0 ? weeklyRealized / weekElapsed : 0;
    const weekProjection = weeklyRealized + weekDailyAvg * weekRemain;
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    const monthProjection = monthlyRealized + monthDailyAvg * monthRemain;

    return [
      { label: "Meta Diária", icon: Target, goal: dailyGoal, realized: dailyRealized, projection: dailyRealized, daysRemaining: 0 },
      { label: "Meta Semanal", icon: Calendar, goal: weeklyGoal, realized: weeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal", icon: TrendingUp, goal: monthlyGoal, realized: monthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [dailyGoal, weeklyGoal, monthlyGoal, dailyRealized, weeklyRealized, monthlyRealized, week, month]);

  const networkMonthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    return monthlyRealized + monthDailyAvg * monthRemain;
  }, [monthlyRealized, month]);

  const networkMonthGap = monthlyGoal > 0 ? monthlyGoal - networkMonthProjection : 0;
  const networkMonthRemain = daysRemaining(month.end);

  // ── Store-level computed ──
  const storeTotalValue = storeMetricsData?.total_value || 0;
  const sStoreDailyRemaining = Math.max(0, sStoreDailyGoal - storeTotalValue);

  const storeGoalPeriods = useMemo(() => {
    const weekElapsed = daysElapsed(week.start);
    const weekRemain = daysRemaining(week.end);
    const weekDailyAvg = weekElapsed > 0 ? sStoreWeeklyRealized / weekElapsed : 0;
    const weekProjection = sStoreWeeklyRealized + weekDailyAvg * weekRemain;
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? sStoreMonthlyRealized / monthElapsed : 0;
    const monthProjection = sStoreMonthlyRealized + monthDailyAvg * monthRemain;

    return [
      { label: "Meta Diária da Loja", icon: Target, goal: sStoreDailyGoal, realized: storeTotalValue, projection: storeTotalValue, daysRemaining: 0 },
      { label: "Meta Semanal da Loja", icon: Calendar, goal: sStoreWeeklyGoal, realized: sStoreWeeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal da Loja", icon: TrendingUp, goal: sStoreMonthlyGoal, realized: sStoreMonthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [sStoreDailyGoal, sStoreWeeklyGoal, sStoreMonthlyGoal, storeTotalValue, sStoreWeeklyRealized, sStoreMonthlyRealized, week, month]);

  const storeMonthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? sStoreMonthlyRealized / monthElapsed : 0;
    return sStoreMonthlyRealized + monthDailyAvg * monthRemain;
  }, [sStoreMonthlyRealized, month]);

  const storeMonthGap = sStoreMonthlyGoal > 0 ? sStoreMonthlyGoal - storeMonthProjection : 0;
  const storeMonthRemain = daysRemaining(month.end);

  const storeAvgConversion = storeDailyRanking.length > 0 ? storeDailyRanking.reduce((s, r) => s + r.conversion_rate, 0) / storeDailyRanking.length : 0;
  const storeAvgTicket = storeDailyRanking.length > 0 ? storeDailyRanking.reduce((s, r) => s + (r.avg_ticket || 0), 0) / storeDailyRanking.length : 0;
  const storeDailyGoalPerSeller = sStoreDailyGoal > 0 && storeDailyRanking.length > 0 ? sStoreDailyGoal / storeDailyRanking.length : 0;

  // ── Header message ──
  const headerMessage = useMemo(() => {
    if (isStoreView) {
      if (sStoreDailyGoal > 0 && storeTotalValue >= sStoreDailyGoal) {
        return { text: `✅ Meta diária de ${selectedStoreName} atingida!`, color: "text-success" };
      }
      if (sStoreDailyGoal > 0 && sStoreDailyRemaining > 0) {
        return { text: `Faltam ${formatBRL(sStoreDailyRemaining)} para ${selectedStoreName} bater a meta de hoje`, color: "text-muted-foreground" };
      }
      if (sStoreMonthlyGoal > 0 && storeMonthProjection < sStoreMonthlyGoal) {
        return { text: `${selectedStoreName} está abaixo do ritmo mensal`, color: "text-destructive" };
      }
      return { text: `Visualizando desempenho de ${selectedStoreName}`, color: "text-muted-foreground" };
    }

    const storesBelowDaily = dailyStores.filter(s => s.goal_target > 0 && s.total_value < (s.goal_target / 22) * 0.5);
    if (storesBelowDaily.length > 0) {
      return { text: `${storesBelowDaily.length} loja${storesBelowDaily.length > 1 ? "s" : ""} abaixo da meta diária`, color: "text-destructive" };
    }
    if (monthlyGoal > 0 && networkMonthProjection >= monthlyGoal) {
      return { text: "Lojas supervisionadas acima do ritmo mensal", color: "text-success" };
    }
    if (monthlyGoal > 0 && networkMonthProjection < monthlyGoal) {
      return { text: "Meta mensal em risco nas lojas supervisionadas", color: "text-destructive" };
    }
    return { text: "Acompanhe o desempenho das lojas e gerencie suas visitas", color: "text-muted-foreground" };
  }, [isStoreView, selectedStoreName, sStoreDailyGoal, storeTotalValue, sStoreDailyRemaining, sStoreMonthlyGoal, storeMonthProjection, dailyStores, monthlyGoal, networkMonthProjection]);

  // ── Daily priority ──
  const dailyPriority = useMemo(() => {
    if (isStoreView) {
      const sellersNoSales = storeDailyRanking.filter(r => r.total_value === 0);
      if (sellersNoSales.length > 0) {
        return { message: `${sellersNoSales.length === 1 ? sellersNoSales[0].seller_name.split(" ")[0] + " sem vendas" : sellersNoSales.length + " vendedores sem vendas"} hoje`, severity: "warning" as const };
      }
      if (sStoreDailyGoal > 0 && sStoreDailyRemaining > 0) {
        return { message: `Loja abaixo da meta hoje — faltam ${formatBRL(sStoreDailyRemaining)}`, severity: sStoreDailyRemaining > sStoreDailyGoal * 0.5 ? "critical" as const : "warning" as const };
      }
      return { message: "Acompanhe a equipe para garantir a meta", severity: "info" as const };
    }

    const storesNoSales = dailyStores.filter(s => s.total_sales === 0);
    if (storesNoSales.length > 0) {
      return { message: `${storesNoSales[0].store_name} sem vendas hoje`, severity: "critical" as const };
    }
    const storesBelowDaily = dailyStores.filter(s => s.goal_target > 0 && s.total_value < (s.goal_target / 22) * 0.3);
    if (storesBelowDaily.length > 0) {
      return { message: `${storesBelowDaily[0].store_name} muito abaixo da meta diária`, severity: "warning" as const };
    }
    if (storesWithoutRecentVisit.length > 0) {
      return { message: `${storesWithoutRecentVisit[0].name} sem visita há mais de 14 dias`, severity: "warning" as const };
    }
    return { message: "Todas as lojas no radar — verifique a agenda de visitas", severity: "info" as const };
  }, [isStoreView, storeDailyRanking, sStoreDailyGoal, sStoreDailyRemaining, dailyStores, storesWithoutRecentVisit]);

  if (loading) {
    return (
      <AppLayout>
        <div className="md:ml-64 flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Active data based on scope
  const activeGoalPeriods = isStoreView ? storeGoalPeriods : networkGoalPeriods;
  const activeMonthlyGoal = isStoreView ? sStoreMonthlyGoal : monthlyGoal;
  const activeMonthlyRealized = isStoreView ? sStoreMonthlyRealized : monthlyRealized;
  const activeMonthProjection = isStoreView ? storeMonthProjection : networkMonthProjection;
  const activeMonthGap = isStoreView ? storeMonthGap : networkMonthGap;
  const activeMonthRemain = isStoreView ? storeMonthRemain : networkMonthRemain;

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Header + Scope Selector */}
          <motion.div {...fadeUp} className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel do Supervisor</h1>
              <p className={`text-sm font-medium ${headerMessage.color}`}>{headerMessage.text}</p>
            </div>
            <DashboardScopeSelector
              stores={storeList}
              selectedScope={selectedScope}
              onScopeChange={handleScopeChange}
              networkLabel="Todas as lojas"
            />
          </motion.div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Prioridade do Dia */}
              <motion.div {...fadeUp}>
                <DailyPriority message={dailyPriority.message} severity={dailyPriority.severity} />
              </motion.div>

              {/* Goal Cards */}
              {activeMonthlyGoal > 0 && (
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.03 }}>
                  <SellerGoalCards periods={activeGoalPeriods} />
                </motion.div>
              )}

              {/* Risco + Velocidade */}
              {activeMonthlyGoal > 0 && (
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MetaRiskIndicator
                    goal={activeMonthlyGoal}
                    realized={activeMonthlyRealized}
                    projection={activeMonthProjection}
                    daysRemaining={activeMonthRemain}
                    label={isStoreView ? "Risco de Meta da Loja" : "Risco das Lojas"}
                  />
                  <RequiredVelocity
                    goal={activeMonthlyGoal}
                    realized={activeMonthlyRealized}
                    daysRemaining={activeMonthRemain}
                    label={isStoreView ? "Velocidade da Loja" : "Velocidade Necessária"}
                  />
                </motion.div>
              )}

              {/* Déficit / Superávit */}
              {activeMonthlyGoal > 0 && (
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
                  <div className={`rounded-2xl p-4 shadow-card border ${activeMonthGap > 0 ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {activeMonthGap > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-success" />}
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {activeMonthGap > 0 ? "Déficit estimado" : "Meta será superada"}
                      </span>
                    </div>
                    <p className={`text-xl font-semibold tabular-nums ${activeMonthGap > 0 ? "text-destructive" : "text-success"}`}>
                      {formatBRL(Math.abs(activeMonthGap))}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── NETWORK VIEW ── */}
              {!isStoreView && (
                <>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.07 }}>
                    <SupervisorHighlights stores={monthlyStores} />
                  </motion.div>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.09 }}>
                    <SupervisorStoreAlerts
                      stores={monthlyStores}
                      networkAvgConversion={netConv}
                      networkAvgTicket={netTicket}
                      storesWithoutRecentVisit={storesWithoutRecentVisit}
                      onCreateAction={handleCreateFromAlert}
                    />
                  </motion.div>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.11 }}>
                    <StoreActionPlans
                      stores={storeList}
                      externalTrigger={actionTrigger}
                      externalPayload={actionPayload}
                    />
                  </motion.div>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.13 }}>
                    <SupervisorPendingActions actions={pendingActions} pendingChecklistCount={pendingChecklistCount} />
                  </motion.div>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                    <SupervisorStoreRanking daily={dailyStores} weekly={weeklyStores} monthly={monthlyStores} />
                  </motion.div>
                </>
              )}

              {/* ── STORE VIEW ── */}
              {isStoreView && storeMetricsData && (
                <>
                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.07 }}>
                    <StoreInsights
                      dailyRanking={storeDailyRanking}
                      storeMetrics={{
                        total_value: storeMetricsData.total_value,
                        conversion_rate: storeMetricsData.conversion_rate,
                        avg_ticket: storeMetricsData.avg_ticket,
                        total_attendances: storeMetricsData.total_attendances,
                      }}
                      dailyGoal={sStoreDailyGoal}
                      weeklyGoal={sStoreWeeklyGoal}
                      weeklyRealized={sStoreWeeklyRealized}
                      monthlyGoal={sStoreMonthlyGoal}
                      monthlyRealized={sStoreMonthlyRealized}
                    />
                  </motion.div>

                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.09 }}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores da Loja</p>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard label="Faturamento" value={formatBRL(storeMetricsData.total_value)} icon={TrendingUp} />
                      <MetricCard label="Conversão" value={`${storeMetricsData.conversion_rate}%`} icon={BarChart3} />
                      <MetricCard label="Ticket Médio" value={formatBRL(storeMetricsData.avg_ticket)} icon={ShoppingCart} />
                      <MetricCard label="P.A. Médio" value={(storeMetricsData.avg_pa || 0).toFixed(1)} icon={ShoppingCart} />
                    </div>
                  </motion.div>

                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.11 }}>
                    <TeamHighlights dailyRanking={storeDailyRanking} />
                  </motion.div>

                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.13 }}>
                    <TeamAlerts
                      dailyRanking={storeDailyRanking}
                      dailyGoal={storeDailyGoalPerSeller}
                      storeAvgConversion={storeAvgConversion}
                      storeAvgTicket={storeAvgTicket}
                    />
                  </motion.div>

                  <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                    <SellerRankingTabs
                      daily={storeDailyRanking}
                      weekly={storeWeeklyRanking}
                      monthly={storeMonthlyRanking}
                      currentUserId={user?.id || ""}
                      goalAchievement={storeGoalAchievement}
                    />
                  </motion.div>
                </>
              )}
            </TabsContent>

            <TabsContent value="agenda"><VisitAgenda /></TabsContent>
            <TabsContent value="history"><VisitHistory /></TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default SupervisorDashboard;
