import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, BarChart3, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    default: // monthly
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }
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
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => getPeriodDates(periodType), [periodType]);
  const today = new Date();
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / 86400000) + 1);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  // Fetch stores for admin
  useEffect(() => {
    if (role !== "admin" && role !== "manager") return;
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
    } else if (role === "manager") {
      await fetchStoreWithSellers(profile!.store_id!);
    } else if (role === "admin") {
      if (selectedStoreId === "all") {
        await fetchAllStores();
      } else {
        await fetchStoreWithSellers(selectedStoreId);
      }
    }

    setLoading(false);
  };

  const fetchSellerPerformance = async () => {
    // Get seller's individual goal or store goal
    let goalValue = 0;

    const { data: individualGoal } = await supabase
      .from("goals")
      .select("target_value")
      .eq("user_id", user!.id)
      .gte("end_date", startStr)
      .lte("start_date", startStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (individualGoal) {
      goalValue = individualGoal.target_value;
    } else if (profile?.store_id) {
      const { data: storeGoal } = await supabase
        .from("goals")
        .select("target_value")
        .eq("store_id", profile.store_id)
        .is("user_id", null)
        .gte("end_date", startStr)
        .lte("start_date", startStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (storeGoal) goalValue = storeGoal.target_value;
    }

    // Get realized sales
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
    // Store goal
    const { data: storeGoal } = await supabase
      .from("goals")
      .select("target_value")
      .eq("store_id", storeId)
      .is("user_id", null)
      .gte("end_date", startStr)
      .lte("start_date", startStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const storeGoalValue = storeGoal?.target_value || 0;

    // Store realized
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

    // Get sellers in this store
    const { data: sellers } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("active", true);

    if (!sellers || sellers.length === 0) {
      setPerformanceData([]);
      return;
    }

    // Get individual goals and sales for each seller
    const sellerPerfs: PerformanceData[] = [];

    for (const seller of sellers) {
      const { data: sellerGoal } = await supabase
        .from("goals")
        .select("target_value")
        .eq("user_id", seller.id)
        .gte("end_date", startStr)
        .lte("start_date", startStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: sellerSales } = await supabase
        .from("sales")
        .select("total_value")
        .eq("seller_id", seller.id)
        .eq("store_id", storeId)
        .eq("status", "won")
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      const realized = (sellerSales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);
      const goalVal = sellerGoal?.target_value || 0;

      sellerPerfs.push(buildPerformance(seller.id, seller.name, goalVal, realized));
    }

    setPerformanceData(sellerPerfs.sort((a, b) => b.realized - a.realized));
  };

  const fetchAllStores = async () => {
    const perfs: PerformanceData[] = [];

    for (const store of stores) {
      const { data: storeGoal } = await supabase
        .from("goals")
        .select("target_value")
        .eq("store_id", store.id)
        .is("user_id", null)
        .gte("end_date", startStr)
        .lte("start_date", startStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: storeSales } = await supabase
        .from("sales")
        .select("total_value")
        .eq("store_id", store.id)
        .eq("status", "won")
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59");

      const realized = (storeSales || []).reduce((sum, s) => sum + (s.total_value || 0), 0);
      perfs.push(buildPerformance(store.id, store.name, storeGoal?.target_value || 0, realized));
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

  // Consolidated metrics
  const consolidated = useMemo(() => {
    const source = storePerformance ? storePerformance : (performanceData.length === 1 ? performanceData[0] : null);
    if (source) return source;
    // If multiple stores, consolidate
    if (performanceData.length > 1) {
      const totalGoal = performanceData.reduce((s, d) => s + d.goal, 0);
      const totalRealized = performanceData.reduce((s, d) => s + d.realized, 0);
      return buildPerformance("network", "Rede", totalGoal, totalRealized);
    }
    return null;
  }, [performanceData, storePerformance]);

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

            {role === "admin" && stores.length > 0 && (
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
                  {/* Progress hero */}
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

                  {/* Metric grid */}
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
