import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, BarChart3, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";

interface PerformanceData {
  entityId: string;
  entityName: string;
  goal: number;
  realized: number;
  percentAchieved: number;
  remaining: number;
  dailyAvg: number;
  projection: number;
  neededPerDay: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
}

interface UserPeriodGoals {
  userId: string;
  userName: string;
  daily: { goal: number; realized: number; pct: number };
  weekly: { goal: number; realized: number; pct: number };
  monthly: { goal: number; realized: number; pct: number };
}

const periodOptions = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

function getPeriodDates(periodType: string): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periodType) {
    case "quarterly": {
      const q = Math.floor(m / 3);
      return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0) };
    }
    case "semiannual": {
      const h = Math.floor(m / 6);
      return { start: new Date(y, h * 6, 1), end: new Date(y, h * 6 + 6, 0) };
    }
    case "annual":
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
    default:
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }
}

function getWeekDates(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getDayDates(): { start: Date; end: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: now, end };
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

const MetricCard = ({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) => (
  <div className="bg-card rounded-2xl p-4 shadow-card space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const PerformanceBar = ({ data }: { data: PerformanceData }) => {
  const projPct = data.goal > 0 ? (data.projection / data.goal) * 100 : 0;
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground truncate">{data.entityName}</p>
        <span className="text-xs text-muted-foreground tabular-nums">{data.percentAchieved.toFixed(0)}%</span>
      </div>
      <Progress value={Math.min(data.percentAchieved, 100)} className="h-2 rounded-full" />
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground tabular-nums">{formatBRL(data.realized)}</p>
          <p>Realizado</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground tabular-nums">{formatBRL(data.goal)}</p>
          <p>Meta</p>
        </div>
        <div className="text-right">
          <p className={`font-medium tabular-nums ${projPct >= 100 ? "text-success" : projPct >= 80 ? "text-foreground" : "text-destructive"}`}>
            {formatBRL(data.projection)}
          </p>
          <p>Projeção</p>
        </div>
      </div>
    </div>
  );
};

const GoalPerformance = () => {
  const { profile, user, role } = useAuth();
  const [periodType, setPeriodType] = useState("monthly");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [storePerformance, setStorePerformance] = useState<PerformanceData | null>(null);
  const [userPeriodGoals, setUserPeriodGoals] = useState<UserPeriodGoals[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => getPeriodDates(periodType), [periodType]);
  const today = new Date();
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / 86400000) + 1);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  useEffect(() => {
    if (role !== "admin" && role !== "manager" && role !== "super_admin") return;
    const fetchStores = async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("active", true);
      if (data) setStores(data);
    };
    fetchStores();
  }, [role]);

  useEffect(() => {
    if (!profile || !user) return;
    fetchPerformance();
  }, [profile, user, periodType, selectedStoreId, role]);

  const fetchPerformance = async () => {
    setLoading(true);

    if (role === "seller") {
      await fetchSellerPerformance();
      await fetchUserPeriodBreakdown([{ id: user!.id, name: profile!.name, store_id: profile!.store_id }], profile!.store_id!);
    } else if (role === "manager") {
      await fetchStoreWithSellers(profile!.store_id!);
    } else if (role === "admin" || role === "super_admin") {
      if (selectedStoreId === "all") {
        await fetchAllStores();
        setUserPeriodGoals([]);
      } else {
        await fetchStoreWithSellers(selectedStoreId);
      }
    }

    setLoading(false);
  };

  const findGoalValue = async (userId: string | null, storeId: string | null, periodStart: string): Promise<number> => {
    // Priority 1: individual goal for this period (by start_date/end_date range)
    if (userId) {
      const { data } = await supabase
        .from("goals")
        .select("target_value, start_date, end_date, period_start")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Find goal where periodStart falls within [start_date, end_date]
        const match = data.find(g => {
          if (g.start_date && g.end_date) {
            return g.start_date <= periodStart && g.end_date >= periodStart;
          }
          // Fallback: match by period_start month
          if (g.period_start) {
            return g.period_start.substring(0, 7) === periodStart.substring(0, 7);
          }
          return false;
        });
        if (match) return match.target_value;
      }
    }

    // Priority 2: store goal
    if (storeId) {
      const { data } = await supabase
        .from("goals")
        .select("target_value, start_date, end_date, period_start")
        .eq("store_id", storeId)
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        const match = data.find(g => {
          if (g.start_date && g.end_date) {
            return g.start_date <= periodStart && g.end_date >= periodStart;
          }
          if (g.period_start) {
            return g.period_start.substring(0, 7) === periodStart.substring(0, 7);
          }
          return false;
        });
        if (match) return match.target_value;
      }
    }

    return 0;
  };

  const fetchUserPeriodBreakdown = async (sellers: { id: string; name: string; store_id: string | null }[], storeId: string) => {
    const monthDates = getPeriodDates("monthly");
    const weekDates = getWeekDates();
    const dayDates = getDayDates();

    const monthStart = monthDates.start.toISOString().split("T")[0];
    const monthEnd = monthDates.end.toISOString().split("T")[0];
    const weekStart = weekDates.start.toISOString().split("T")[0];
    const weekEnd = weekDates.end.toISOString().split("T")[0];
    const dayStart = dayDates.start.toISOString().split("T")[0];

    const totalDaysInMonth = Math.ceil((monthDates.end.getTime() - monthDates.start.getTime()) / 86400000) + 1;
    const weeksInMonth = Math.max(1, Math.ceil(totalDaysInMonth / 7));

    const results: UserPeriodGoals[] = [];

    for (const seller of sellers) {
      // Get monthly goal (base)
      const monthlyGoal = await findGoalValue(seller.id, storeId, monthStart);

      // Check for explicit daily/weekly goals
      const dailyExplicit = await findExplicitGoal(seller.id, "daily", dayStart);
      const weeklyExplicit = await findExplicitGoal(seller.id, "weekly", weekStart);

      const dailyGoal = dailyExplicit ?? (monthlyGoal > 0 ? monthlyGoal / totalDaysInMonth : 0);
      const weeklyGoal = weeklyExplicit ?? (monthlyGoal > 0 ? monthlyGoal / weeksInMonth : 0);

      // Realized values
      const dailyRealized = await getSalesTotal(seller.id, storeId, dayStart, dayStart + "T23:59:59");
      const weeklyRealized = await getSalesTotal(seller.id, storeId, weekStart, weekEnd + "T23:59:59");
      const monthlyRealized = await getSalesTotal(seller.id, storeId, monthStart, monthEnd + "T23:59:59");

      results.push({
        userId: seller.id,
        userName: seller.name,
        daily: { goal: dailyGoal, realized: dailyRealized, pct: dailyGoal > 0 ? (dailyRealized / dailyGoal) * 100 : 0 },
        weekly: { goal: weeklyGoal, realized: weeklyRealized, pct: weeklyGoal > 0 ? (weeklyRealized / weeklyGoal) * 100 : 0 },
        monthly: { goal: monthlyGoal, realized: monthlyRealized, pct: monthlyGoal > 0 ? (monthlyRealized / monthlyGoal) * 100 : 0 },
      });
    }

    setUserPeriodGoals(results);
  };

  const findExplicitGoal = async (userId: string, periodType: string, periodStart: string): Promise<number | null> => {
    const { data } = await supabase
      .from("goals")
      .select("target_value")
      .eq("user_id", userId)
      .eq("period_type", periodType as any)
      .gte("end_date", periodStart)
      .lte("start_date", periodStart)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? data.target_value : null;
  };

  const getSalesTotal = async (sellerId: string, storeId: string, from: string, to: string): Promise<number> => {
    const { data } = await supabase
      .from("sales")
      .select("total_value")
      .eq("seller_id", sellerId)
      .eq("store_id", storeId)
      .eq("status", "won")
      .gte("created_at", from)
      .lte("created_at", to);
    return (data || []).reduce((sum, s) => sum + (s.total_value || 0), 0);
  };

  const fetchSellerPerformance = async () => {
    let goalValue = 0;

    // Use the unified findGoalValue
    goalValue = await findGoalValue(user!.id, profile?.store_id || null, startStr);

    const { data: sales } = await supabase
      .from("sales")
      .select("total_value")
      .eq("seller_id", user!.id)
      .eq("status", "won")
      .gte("created_at", startStr)
      .lte("created_at", endStr + "T23:59:59");

    const realized = (sales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);

    const perf = buildPerformance(user!.id, profile?.name || "Você", goalValue, realized);
    setPerformanceData([perf]);
    setStorePerformance(null);
  };

  const fetchStoreWithSellers = async (storeId: string) => {
    const storeGoalValue = await findGoalValue(null, storeId, startStr);

    const { data: storeSales } = await supabase
      .from("sales")
      .select("total_value")
      .eq("store_id", storeId)
      .eq("status", "won")
      .gte("created_at", startStr)
      .lte("created_at", endStr + "T23:59:59");

    const storeRealized = (storeSales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);

    const storeName = stores.find(s => s.id === storeId)?.name || "Loja";
    setStorePerformance(buildPerformance(storeId, storeName, storeGoalValue, storeRealized));

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, store_id, manager_can_sell")
      .eq("store_id", storeId)
      .eq("active", true);

    if (!profilesData || profilesData.length === 0) {
      setPerformanceData([]);
      setUserPeriodGoals([]);
      return;
    }

    // Filter to only eligible sellers: role=seller OR role=manager with manager_can_sell
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", profilesData.map(p => p.id));

    const roleMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));
    
    const sellers = profilesData.filter(p => {
      const r = roleMap.get(p.id);
      if (r === "seller") return true;
      if (r === "manager" && p.manager_can_sell) return true;
      return false;
    });

    if (sellers.length === 0) {
      setPerformanceData([]);
      setUserPeriodGoals([]);
      return;
    }

    const sellerPerfs: PerformanceData[] = [];

    for (const seller of sellers) {
      const goalVal = await findGoalValue(seller.id, storeId, startStr);

      const { data: sellerSales } = await supabase
        .from("sales")
        .select("total_value")
        .eq("seller_id", seller.id)
        .eq("store_id", storeId)
        .eq("status", "won")
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      const realized = (sellerSales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);

      sellerPerfs.push(buildPerformance(seller.id, seller.name, goalVal, realized));
    }

    setPerformanceData(sellerPerfs.sort((a, b) => b.realized - a.realized));
    await fetchUserPeriodBreakdown(sellers, storeId);
  };

  const fetchAllStores = async () => {
    const perfs: PerformanceData[] = [];

    for (const store of stores) {
      const storeGoalValue = await findGoalValue(null, store.id, startStr);

      const { data: storeSales } = await supabase
        .from("sales")
        .select("total_value")
        .eq("store_id", store.id)
        .eq("status", "won")
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      const realized = (storeSales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);
      perfs.push(buildPerformance(store.id, store.name, storeGoalValue, realized));
    }

    setPerformanceData(perfs.sort((a, b) => b.realized - a.realized));
    setStorePerformance(null);
  };

  const buildPerformance = (id: string, name: string, goal: number, realized: number): PerformanceData => {
    const percentAchieved = goal > 0 ? (realized / goal) * 100 : 0;
    const remaining = Math.max(0, goal - realized);
    const dailyAvg = realized / daysElapsed;
    const projection = dailyAvg * totalDays;
    const neededPerDay = daysRemaining > 0 ? remaining / daysRemaining : 0;

    return { entityId: id, entityName: name, goal, realized, percentAchieved, remaining, dailyAvg, projection, neededPerDay, daysElapsed, daysRemaining, totalDays };
  };

  const consolidated = useMemo(() => {
    const source = storePerformance ? storePerformance : (performanceData.length === 1 ? performanceData[0] : null);
    if (source) return source;
    if (performanceData.length > 1) {
      const totalGoal = performanceData.reduce((s, d) => s + d.goal, 0);
      const totalRealized = performanceData.reduce((s, d) => s + d.realized, 0);
      return buildPerformance("network", "Rede", totalGoal, totalRealized);
    }
    return null;
  }, [performanceData, storePerformance]);

  const pctColor = (pct: number) => pct >= 100 ? "text-success" : pct >= 70 ? "text-foreground" : "text-destructive";

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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Performance de Metas
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe o atingimento e a projeção de fechamento
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="flex flex-wrap gap-3">
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(role === "admin" || role === "super_admin") && stores.length > 0 && (
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span>{daysElapsed} dias / {totalDays} total · {daysRemaining} restantes</span>
            </div>
          </motion.div>

          {/* Consolidated Cards */}
          {consolidated && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              {consolidated.goal === 0 ? (
                <div className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma meta definida para este período. Defina metas no Planejador.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {consolidated.entityName}
                      </span>
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                        {formatBRL(consolidated.realized)}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        / {formatBRL(consolidated.goal)}
                      </span>
                    </div>
                    <Progress value={Math.min(consolidated.percentAchieved, 100)} className="h-2 rounded-full" />
                    <p className="text-xs text-muted-foreground">
                      {consolidated.percentAchieved.toFixed(1)}% atingido
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <MetricCard
                      label="Projeção Final"
                      value={formatBRL(consolidated.projection)}
                      sub={`${consolidated.goal > 0 ? ((consolidated.projection / consolidated.goal) * 100).toFixed(0) : 0}% da meta`}
                      icon={TrendingUp}
                      accent
                    />
                    <MetricCard
                      label="Restante"
                      value={formatBRL(consolidated.remaining)}
                      sub={consolidated.remaining > 0 ? `${formatBRL(consolidated.neededPerDay)}/dia` : "Meta batida!"}
                      icon={Target}
                    />
                    <MetricCard
                      label="Média Diária"
                      value={formatBRL(consolidated.dailyAvg)}
                      sub={`${consolidated.daysElapsed} dias decorridos`}
                      icon={BarChart3}
                    />
                    <MetricCard
                      label="Necessário/Dia"
                      value={consolidated.daysRemaining > 0 ? formatBRL(consolidated.neededPerDay) : "—"}
                      sub={`${consolidated.daysRemaining} dias restantes`}
                      icon={Calendar}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Detail bars */}
          {performanceData.length > 0 && (role !== "seller" || performanceData.length > 1) && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {role === "admin" && selectedStoreId === "all" ? "Por Loja" : "Por Vendedor"}
              </h2>
              <div className="space-y-2">
                {performanceData.map((d, i) => (
                  <motion.div
                    key={d.entityId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <PerformanceBar data={d} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* User Period Goals Breakdown */}
          {userPeriodGoals.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    % da Meta por Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-right">Meta Diária</TableHead>
                          <TableHead className="text-right">Realiz. Dia</TableHead>
                          <TableHead className="text-right">% Dia</TableHead>
                          <TableHead className="text-right">Meta Semanal</TableHead>
                          <TableHead className="text-right">Realiz. Sem.</TableHead>
                          <TableHead className="text-right">% Sem.</TableHead>
                          <TableHead className="text-right">Meta Mensal</TableHead>
                          <TableHead className="text-right">Realiz. Mês</TableHead>
                          <TableHead className="text-right">% Mês</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPeriodGoals.map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell className="font-medium text-sm">{u.userName}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{u.daily.goal > 0 ? formatBRL(u.daily.goal) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">{formatBRL(u.daily.realized)}</TableCell>
                            <TableCell className={`text-right text-xs font-semibold ${pctColor(u.daily.pct)}`}>{u.daily.goal > 0 ? `${u.daily.pct.toFixed(0)}%` : "—"}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{u.weekly.goal > 0 ? formatBRL(u.weekly.goal) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">{formatBRL(u.weekly.realized)}</TableCell>
                            <TableCell className={`text-right text-xs font-semibold ${pctColor(u.weekly.pct)}`}>{u.weekly.goal > 0 ? `${u.weekly.pct.toFixed(0)}%` : "—"}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{u.monthly.goal > 0 ? formatBRL(u.monthly.goal) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">{formatBRL(u.monthly.realized)}</TableCell>
                            <TableCell className={`text-right text-xs font-semibold ${pctColor(u.monthly.pct)}`}>{u.monthly.goal > 0 ? `${u.monthly.pct.toFixed(0)}%` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state */}
          {performanceData.length === 0 && !loading && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Nenhum dado de performance para o período selecionado.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default GoalPerformance;
