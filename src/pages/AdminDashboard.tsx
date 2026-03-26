import { useEffect, useState, useMemo, useCallback } from "react";
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
import SellerRankingTabs, { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import NetworkStoreRanking, { StoreRankingEntry } from "@/components/admin/NetworkStoreRanking";
import NetworkInsights from "@/components/admin/NetworkInsights";
import NetworkHighlights from "@/components/admin/NetworkHighlights";
import StoresAtRisk from "@/components/admin/StoresAtRisk";
import DailyPriority from "@/components/dashboard/DailyPriority";
import MetaRiskIndicator from "@/components/dashboard/MetaRiskIndicator";
import RequiredVelocity from "@/components/dashboard/RequiredVelocity";
import DashboardScopeSelector from "@/components/dashboard/DashboardScopeSelector";
import StoreInsights from "@/components/manager/StoreInsights";
import TeamHighlights from "@/components/manager/TeamHighlights";
import TeamAlerts from "@/components/manager/TeamAlerts";

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

interface StoreMetrics {
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

const SCOPE_KEY = "dashboard_scope_selected_admin";

const AdminDashboard = () => {
  const { profile, role, user } = useAuth();
  const navigate = useNavigate();

  // Scope
  const [selectedScope, setSelectedScope] = useState<string>(() => {
    return localStorage.getItem(SCOPE_KEY) || "network";
  });

  // Network-level state
  const [stores, setStores] = useState<StoreData[]>([]);
  const [storeList, setStoreList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [weeklyRealized, setWeeklyRealized] = useState(0);
  const [monthlyRealized, setMonthlyRealized] = useState(0);

  const [weeklyStores, setWeeklyStores] = useState<StoreRankingEntry[]>([]);
  const [monthlyStores, setMonthlyStores] = useState<StoreRankingEntry[]>([]);

  // Store-level state (when a specific store is selected)
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics | null>(null);
  const [storeDailyRanking, setStoreDailyRanking] = useState<RankingEntry[]>([]);
  const [storeWeeklyRanking, setStoreWeeklyRanking] = useState<RankingEntry[]>([]);
  const [storeMonthlyRanking, setStoreMonthlyRanking] = useState<RankingEntry[]>([]);
  const [storeGoalAchievement, setStoreGoalAchievement] = useState<Record<string, { pct: number }>>({});
  const [storeDailyGoal, setStoreDailyGoal] = useState(0);
  const [storeWeeklyGoal, setStoreWeeklyGoal] = useState(0);
  const [storeMonthlyGoal, setStoreMonthlyGoal] = useState(0);
  const [storeWeeklyRealized, setStoreWeeklyRealized] = useState(0);
  const [storeMonthlyRealized, setStoreMonthlyRealized] = useState(0);

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

  const isStoreView = selectedScope !== "network";
  const selectedStoreName = storeList.find(s => s.id === selectedScope)?.name || "";

  const handleScopeChange = useCallback((scope: string) => {
    setSelectedScope(scope);
    localStorage.setItem(SCOPE_KEY, scope);
  }, []);

  // Validate persisted scope against available stores
  useEffect(() => {
    if (storeList.length > 0 && selectedScope !== "network") {
      if (!storeList.find(s => s.id === selectedScope)) {
        handleScopeChange("network");
      }
    }
  }, [storeList, selectedScope, handleScopeChange]);

  // Load network data
  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    loadNetworkData();
  }, [profile?.organization_id, role]);

  const loadNetworkData = async () => {
    try {
      let query = supabase.from("stores").select("id, name").eq("active", true);
      if (profile?.organization_id) query = query.eq("organization_id", profile.organization_id);

      const { data: fetchedStores } = await query;
      if (!fetchedStores || fetchedStores.length === 0) { setStoreList([]); setLoading(false); return; }

      setStoreList(fetchedStores);

      const storePromises = fetchedStores.map(async (store) => {
        const [metricsRes, goalRes, weekRes, monthRes] = await Promise.all([
          supabase.rpc("get_daily_metrics", { _store_id: store.id, _date: today }),
          supabase.from("goals").select("target_value, current_value").eq("store_id", store.id).is("user_id", null).eq("period_type", "monthly").order("period_start", { ascending: false }).limit(1),
          supabase.rpc("get_seller_ranking_period", { _store_id: store.id, _start_date: week.start, _end_date: week.end }),
          supabase.rpc("get_seller_ranking_period", { _store_id: store.id, _start_date: month.start, _end_date: month.end }),
        ]);

        const m = metricsRes.data?.[0];
        const goal = goalRes.data?.[0];

        const storeData: StoreData = {
          id: store.id, name: store.name,
          total_value: m?.total_value || 0, won_sales: m?.won_sales || 0,
          total_sales: m?.total_sales || 0, conversion_rate: m?.conversion_rate || 0,
          avg_ticket: m?.avg_ticket || 0, goal_target: goal?.target_value || 0,
          goal_current: goal?.current_value || 0,
        };

        const weeklyVal = (weekRes.data || []).reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const weeklyWon = (weekRes.data || []).reduce((s: number, r: any) => s + (r.won_count || 0), 0);
        const weeklyTotal = (weekRes.data || []).reduce((s: number, r: any) => s + (r.total_count || 0), 0);
        const monthlyVal = (monthRes.data || []).reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const monthlyWon = (monthRes.data || []).reduce((s: number, r: any) => s + (r.won_count || 0), 0);
        const monthlyTotal = (monthRes.data || []).reduce((s: number, r: any) => s + (r.total_count || 0), 0);
        const goalPct = goal?.target_value > 0 ? ((goal?.current_value || 0) / goal.target_value) * 100 : 0;

        return {
          storeData,
          weekEntry: { id: store.id, name: store.name, total_value: weeklyVal, won_sales: weeklyWon, total_sales: weeklyTotal, conversion_rate: weeklyTotal > 0 ? (weeklyWon / weeklyTotal) * 100 : 0, avg_ticket: weeklyWon > 0 ? weeklyVal / weeklyWon : 0, goal_pct: goalPct } as StoreRankingEntry,
          monthEntry: { id: store.id, name: store.name, total_value: monthlyVal, won_sales: monthlyWon, total_sales: monthlyTotal, conversion_rate: monthlyTotal > 0 ? (monthlyWon / monthlyTotal) * 100 : 0, avg_ticket: monthlyWon > 0 ? monthlyVal / monthlyWon : 0, goal_pct: goalPct } as StoreRankingEntry,
          weeklyVal, monthlyVal,
        };
      });

      const results = await Promise.all(storePromises);
      const storeMetricsList: StoreData[] = [];
      const weekEntries: StoreRankingEntry[] = [];
      const monthEntries: StoreRankingEntry[] = [];
      let totalWeekly = 0, totalMonthly = 0;

      for (const r of results) {
        storeMetricsList.push(r.storeData);
        weekEntries.push(r.weekEntry);
        monthEntries.push(r.monthEntry);
        totalWeekly += r.weeklyVal;
        totalMonthly += r.monthlyVal;
      }

      setStores(storeMetricsList);
      setWeeklyStores(weekEntries);
      setMonthlyStores(monthEntries);
      setWeeklyRealized(totalWeekly);

      const totalGoalTarget = storeMetricsList.reduce((s, st) => s + st.goal_target, 0);
      const totalGoalCurrent = storeMetricsList.reduce((s, st) => s + st.goal_current, 0);
      setMonthlyGoal(totalGoalTarget);
      setMonthlyRealized(totalMonthly > totalGoalCurrent ? totalMonthly : totalGoalCurrent);

      setWeeklyGoal(totalGoalTarget > 0 ? Math.round(totalGoalTarget / 4.33) : 0);
      setDailyGoal(totalGoalTarget > 0 ? Math.round(totalGoalTarget / 22) : 0);
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load store-level data when a specific store is selected
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

    if (metricsRes.data?.[0]) setStoreMetrics(metricsRes.data[0] as StoreMetrics);
    else setStoreMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });

    if (dailyRes.data) setStoreDailyRanking(dailyRes.data as RankingEntry[]);
    if (weeklyRes.data) setStoreWeeklyRanking(weeklyRes.data as RankingEntry[]);
    if (monthlyRes.data) setStoreMonthlyRanking(monthlyRes.data as RankingEntry[]);

    const sWeekRealized = (weeklyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    const sMonthRealized = (monthlyRes.data as RankingEntry[] || []).reduce((s, r) => s + r.total_value, 0);
    setStoreWeeklyRealized(sWeekRealized);
    setStoreMonthlyRealized(sMonthRealized);

    const resolvedMonthly = sMonthlyGoal.data?.target_value || 0;
    const resolvedWeekly = sWeeklyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 4.33) : 0);
    const resolvedDaily = sDailyGoal.data?.target_value || (resolvedMonthly > 0 ? Math.round(resolvedMonthly / 22) : 0);

    setStoreDailyGoal(resolvedDaily);
    setStoreWeeklyGoal(resolvedWeekly);
    setStoreMonthlyGoal(resolvedMonthly);

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

  // ── Network computed values ──
  const networkValue = stores.reduce((s, st) => s + st.total_value, 0);
  const networkSales = stores.reduce((s, st) => s + st.total_sales, 0);
  const networkWon = stores.reduce((s, st) => s + st.won_sales, 0);
  const networkConversion = networkSales > 0 ? (networkWon / networkSales) * 100 : 0;
  const networkAvgTicket = networkWon > 0 ? networkValue / networkWon : 0;

  const dailyStoreRanking: StoreRankingEntry[] = stores.map(s => ({
    id: s.id, name: s.name, total_value: s.total_value, won_sales: s.won_sales,
    total_sales: s.total_sales, conversion_rate: s.conversion_rate, avg_ticket: s.avg_ticket,
    goal_pct: s.goal_target > 0 ? (s.goal_current / s.goal_target) * 100 : 0,
  }));

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
      { label: "Meta Diária da Rede", icon: Target, goal: dailyGoal, realized: networkValue, projection: networkValue, daysRemaining: 0 },
      { label: "Meta Semanal da Rede", icon: Calendar, goal: weeklyGoal, realized: weeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal da Rede", icon: TrendingUp, goal: monthlyGoal, realized: monthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [dailyGoal, weeklyGoal, monthlyGoal, networkValue, weeklyRealized, monthlyRealized, week, month]);

  const networkMonthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? monthlyRealized / monthElapsed : 0;
    return monthlyRealized + monthDailyAvg * monthRemain;
  }, [monthlyRealized, month]);

  const networkMonthGap = monthlyGoal > 0 ? monthlyGoal - networkMonthProjection : 0;
  const networkMonthRemain = daysRemaining(month.end);

  // ── Store-level computed values ──
  // Use daily metrics from RPC for today's data
  const storeTodayValue = storeMetrics?.total_value || 0;
  // Also compute today's total from daily ranking for consistency check
  const storeDailyRankingTotal = storeDailyRanking.reduce((s, r) => s + r.total_value, 0);
  // Use the higher of the two to avoid showing 0 when data exists
  const storeTotalValue = Math.max(storeTodayValue, storeDailyRankingTotal);
  const storeDailyRemaining = Math.max(0, storeDailyGoal - storeTotalValue);

  // Compute store KPIs from ranking data (same source as ranking component) for consistency
  const storeKPIs = useMemo(() => {
    // Daily KPIs from daily ranking data
    const dWon = storeDailyRanking.reduce((s, r) => s + r.won_count, 0);
    const dTotal = storeDailyRanking.reduce((s, r) => s + r.total_count, 0);
    const dValue = storeDailyRanking.reduce((s, r) => s + r.total_value, 0);
    const dConv = dTotal > 0 ? (dWon / dTotal) * 100 : 0;
    const dTicket = dWon > 0 ? dValue / dWon : 0;
    const dPa = storeDailyRanking.filter(r => r.avg_pa > 0).length > 0
      ? storeDailyRanking.reduce((s, r) => s + (r.avg_pa || 0), 0) / storeDailyRanking.filter(r => r.avg_pa > 0).length
      : 0;

    // Monthly KPIs from monthly ranking data
    const mWon = storeMonthlyRanking.reduce((s, r) => s + r.won_count, 0);
    const mTotal = storeMonthlyRanking.reduce((s, r) => s + r.total_count, 0);
    const mValue = storeMonthlyRanking.reduce((s, r) => s + r.total_value, 0);
    const mConv = mTotal > 0 ? (mWon / mTotal) * 100 : 0;
    const mTicket = mWon > 0 ? mValue / mWon : 0;
    const mPa = storeMonthlyRanking.filter(r => r.avg_pa > 0).length > 0
      ? storeMonthlyRanking.reduce((s, r) => s + (r.avg_pa || 0), 0) / storeMonthlyRanking.filter(r => r.avg_pa > 0).length
      : 0;

    return {
      daily: { total_value: dValue, conversion_rate: dConv, avg_ticket: dTicket, avg_pa: dPa, total_sales: dTotal, won_sales: dWon },
      monthly: { total_value: mValue, conversion_rate: mConv, avg_ticket: mTicket, avg_pa: mPa, total_sales: mTotal, won_sales: mWon },
    };
  }, [storeDailyRanking, storeMonthlyRanking]);

  const storeGoalPeriods = useMemo(() => {
    const weekElapsed = daysElapsed(week.start);
    const weekRemain = daysRemaining(week.end);
    const weekDailyAvg = weekElapsed > 0 ? storeWeeklyRealized / weekElapsed : 0;
    const weekProjection = storeWeeklyRealized + weekDailyAvg * weekRemain;
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? storeMonthlyRealized / monthElapsed : 0;
    const monthProjection = storeMonthlyRealized + monthDailyAvg * monthRemain;

    return [
      { label: "Meta Diária da Loja", icon: Target, goal: storeDailyGoal, realized: storeTotalValue, projection: storeTotalValue, daysRemaining: 0 },
      { label: "Meta Semanal da Loja", icon: Calendar, goal: storeWeeklyGoal, realized: storeWeeklyRealized, projection: weekProjection, daysRemaining: weekRemain },
      { label: "Meta Mensal da Loja", icon: TrendingUp, goal: storeMonthlyGoal, realized: storeMonthlyRealized, projection: monthProjection, daysRemaining: monthRemain },
    ];
  }, [storeDailyGoal, storeWeeklyGoal, storeMonthlyGoal, storeTotalValue, storeWeeklyRealized, storeMonthlyRealized, week, month]);

  const storeMonthProjection = useMemo(() => {
    const monthElapsed = daysElapsed(month.start);
    const monthRemain = daysRemaining(month.end);
    const monthDailyAvg = monthElapsed > 0 ? storeMonthlyRealized / monthElapsed : 0;
    return storeMonthlyRealized + monthDailyAvg * monthRemain;
  }, [storeMonthlyRealized, month]);

  const storeMonthGap = storeMonthlyGoal > 0 ? storeMonthlyGoal - storeMonthProjection : 0;
  const storeMonthRemain = daysRemaining(month.end);

  const storeAvgConversion = storeDailyRanking.length > 0 ? storeDailyRanking.reduce((s, r) => s + r.conversion_rate, 0) / storeDailyRanking.length : 0;
  const storeAvgTicket = storeDailyRanking.length > 0 ? storeDailyRanking.reduce((s, r) => s + (r.avg_ticket || 0), 0) / storeDailyRanking.length : 0;
  const storeDailyGoalPerSeller = storeDailyGoal > 0 && storeDailyRanking.length > 0 ? storeDailyGoal / storeDailyRanking.length : 0;

  // ── Header message ──
  const headerMessage = useMemo(() => {
    if (isStoreView) {
      if (storeDailyGoal > 0 && storeTotalValue >= storeDailyGoal) {
        return { text: `✅ Meta diária de ${selectedStoreName} atingida!`, color: "text-success" };
      }
      if (storeDailyGoal > 0 && storeDailyRemaining > 0) {
        return { text: `Faltam ${formatBRL(storeDailyRemaining)} para ${selectedStoreName} bater a meta de hoje`, color: "text-muted-foreground" };
      }
      if (storeMonthlyGoal > 0 && storeMonthProjection < storeMonthlyGoal) {
        return { text: `${selectedStoreName} está abaixo do ritmo mensal`, color: "text-destructive" };
      }
      return { text: `Visualizando desempenho de ${selectedStoreName}`, color: "text-muted-foreground" };
    }

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
      return { text: "A rede está abaixo do ritmo semanal", color: "text-destructive" };
    }
    if (monthlyGoal > 0 && networkMonthProjection < monthlyGoal) {
      return { text: "A meta mensal da rede está em risco", color: "text-destructive" };
    }
    if (monthlyGoal > 0 && networkMonthProjection >= monthlyGoal) {
      return { text: "A rede já superou a meta do período", color: "text-success" };
    }
    return { text: `Visão consolidada da rede · ${stores.length} loja${stores.length !== 1 ? "s" : ""} ativa${stores.length !== 1 ? "s" : ""}`, color: "text-muted-foreground" };
  }, [isStoreView, selectedStoreName, storeDailyGoal, storeTotalValue, storeDailyRemaining, storeMonthlyGoal, storeMonthProjection, dailyGoal, networkValue, weeklyGoal, weeklyRealized, monthlyGoal, networkMonthProjection, stores.length]);

  // ── Daily priority ──
  const dailyPriority = useMemo(() => {
    if (isStoreView) {
      const sellersNoSales = storeDailyRanking.filter(r => r.total_value === 0);
      if (sellersNoSales.length > 0) {
        return { message: `${sellersNoSales.length === 1 ? sellersNoSales[0].seller_name.split(" ")[0] + " sem vendas" : sellersNoSales.length + " vendedores sem vendas"} hoje`, severity: "warning" as const };
      }
      if (storeDailyGoal > 0 && storeDailyRemaining > 0) {
        return { message: `Loja abaixo da meta hoje — faltam ${formatBRL(storeDailyRemaining)}`, severity: storeDailyRemaining > storeDailyGoal * 0.5 ? "critical" as const : "warning" as const };
      }
      if (storeDailyGoal > 0 && storeTotalValue >= storeDailyGoal) {
        return { message: "Meta diária atingida! Acompanhe a equipe", severity: "info" as const };
      }
      return { message: "Acompanhe a equipe para garantir a meta", severity: "info" as const };
    }

    const storesNoSales = stores.filter(s => s.total_sales === 0);
    if (storesNoSales.length > 0) {
      return { message: `${storesNoSales.length === 1 ? storesNoSales[0].name + " sem vendas" : storesNoSales.length + " lojas sem vendas"} hoje`, severity: "critical" as const };
    }
    const lowConv = stores.filter(s => s.conversion_rate > 0 && s.conversion_rate < networkConversion * 0.5);
    if (lowConv.length > 0) {
      return { message: `${lowConv[0].name} com conversão crítica (${lowConv[0].conversion_rate.toFixed(1)}%)`, severity: "warning" as const };
    }
    if (monthlyGoal > 0 && networkMonthProjection < monthlyGoal) {
      return { message: `Rede abaixo do ritmo — déficit estimado de ${formatBRL(Math.abs(networkMonthGap))}`, severity: "warning" as const };
    }
    return { message: "Rede operando dentro do esperado", severity: "info" as const };
  }, [isStoreView, storeDailyRanking, storeDailyGoal, storeDailyRemaining, storeTotalValue, stores, networkConversion, monthlyGoal, networkMonthProjection, networkMonthGap]);

  if (loading) {
    return (
      <AppLayout>
        <div className="md:ml-64 flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Decide which goal/projection data to use
  const activeGoalPeriods = isStoreView ? storeGoalPeriods : networkGoalPeriods;
  const activeMonthlyGoal = isStoreView ? storeMonthlyGoal : monthlyGoal;
  const activeMonthlyRealized = isStoreView ? storeMonthlyRealized : monthlyRealized;
  const activeMonthProjection = isStoreView ? storeMonthProjection : networkMonthProjection;
  const activeMonthGap = isStoreView ? storeMonthGap : networkMonthGap;
  const activeMonthRemain = isStoreView ? storeMonthRemain : networkMonthRemain;

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 1) Header + Scope Selector */}
          <motion.div {...fadeUp} className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel Administrativo</h1>
              <p className={`text-sm font-medium ${headerMessage.color}`}>{headerMessage.text}</p>
            </div>
            <DashboardScopeSelector
              stores={storeList}
              selectedScope={selectedScope}
              onScopeChange={handleScopeChange}
            />
          </motion.div>

          {/* 2) Prioridade do Dia */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.03 }}>
            <DailyPriority message={dailyPriority.message} severity={dailyPriority.severity} />
          </motion.div>

          {/* 3) Goal Cards */}
          {activeMonthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
              <SellerGoalCards periods={activeGoalPeriods} />
            </motion.div>
          )}

          {/* 4) Risco + Velocidade */}
          {activeMonthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.07 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetaRiskIndicator
                goal={activeMonthlyGoal}
                realized={activeMonthlyRealized}
                projection={activeMonthProjection}
                daysRemaining={activeMonthRemain}
                label={isStoreView ? "Risco de Meta da Loja" : "Risco de Meta da Rede"}
              />
              <RequiredVelocity
                goal={activeMonthlyGoal}
                realized={activeMonthlyRealized}
                daysRemaining={activeMonthRemain}
                label={isStoreView ? "Velocidade da Loja" : "Velocidade da Rede"}
              />
            </motion.div>
          )}

          {/* 5) Déficit / Superávit */}
          {activeMonthlyGoal > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
              <div className={`rounded-2xl p-4 shadow-card border ${activeMonthGap > 0 ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {activeMonthGap > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-success" />}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {activeMonthGap > 0 ? "Déficit estimado para atingir a meta" : "Meta será superada"}
                  </span>
                </div>
                <p className={`text-xl font-semibold tabular-nums ${activeMonthGap > 0 ? "text-destructive" : "text-success"}`}>
                  {formatBRL(Math.abs(activeMonthGap))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeMonthGap > 0
                    ? `Baseado na projeção no ritmo atual ${isStoreView ? "da loja" : "da rede"}`
                    : `Projeção indica que a meta mensal será superada`}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── NETWORK VIEW ── */}
          {!isStoreView && (
            <>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                <StoresAtRisk stores={stores} networkAvgConversion={networkConversion} />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
                <NetworkInsights
                  stores={stores}
                  networkGoal={monthlyGoal}
                  networkCurrent={monthlyRealized}
                  weeklyGoal={weeklyGoal}
                  weeklyRealized={weeklyRealized}
                />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores da Rede</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Faturamento Hoje" value={formatBRL(networkValue)} icon={TrendingUp} />
                  <MetricCard label="Conversão" value={`${networkConversion.toFixed(1)}%`} icon={BarChart3} />
                  <MetricCard label="Ticket Médio" value={formatBRL(networkAvgTicket)} icon={ShoppingCart} />
                  <MetricCard label="Atendimentos" value={String(networkSales)} icon={ShoppingCart} />
                </div>
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
                <NetworkHighlights stores={stores} />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
                <NetworkStoreRanking daily={dailyStoreRanking} weekly={weeklyStores} monthly={monthlyStores} />
              </motion.div>
            </>
          )}

          {/* ── STORE VIEW ── */}
          {isStoreView && storeMetrics && (
            <>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                <StoreInsights
                  dailyRanking={storeDailyRanking}
                  storeMetrics={{
                    total_value: storeMetrics.total_value,
                    conversion_rate: storeMetrics.conversion_rate,
                    avg_ticket: storeMetrics.avg_ticket,
                    total_attendances: storeMetrics.total_attendances,
                  }}
                  dailyGoal={storeDailyGoal}
                  weeklyGoal={storeWeeklyGoal}
                  weeklyRealized={storeWeeklyRealized}
                  monthlyGoal={storeMonthlyGoal}
                  monthlyRealized={storeMonthlyRealized}
                />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Indicadores da Loja</p>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Faturamento" value={formatBRL(storeMetrics.total_value)} icon={TrendingUp} />
                  <MetricCard label="Conversão" value={`${storeMetrics.conversion_rate}%`} icon={BarChart3} />
                  <MetricCard label="Ticket Médio" value={formatBRL(storeMetrics.avg_ticket)} icon={ShoppingCart} />
                  <MetricCard label="P.A. Médio" value={(storeMetrics.avg_pa || 0).toFixed(1)} icon={ShoppingCart} />
                </div>
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
                <TeamHighlights dailyRanking={storeDailyRanking} />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
                <TeamAlerts
                  dailyRanking={storeDailyRanking}
                  dailyGoal={storeDailyGoalPerSeller}
                  storeAvgConversion={storeAvgConversion}
                  storeAvgTicket={storeAvgTicket}
                />
              </motion.div>

              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
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
          {stores.length === 0 && !isStoreView && (
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
