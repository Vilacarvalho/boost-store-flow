import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VisitAgenda } from "@/components/supervisor/VisitAgenda";
import { VisitHistory } from "@/components/supervisor/VisitHistory";
import SupervisorStoreRanking, { StoreRankingEntry } from "@/components/supervisor/SupervisorStoreRanking";
import SupervisorStoreAlerts from "@/components/supervisor/SupervisorStoreAlerts";
import SupervisorHighlights from "@/components/supervisor/SupervisorHighlights";
import SupervisorPendingActions, { PendingAction } from "@/components/supervisor/SupervisorPendingActions";
import StoreActionPlans, { CreateActionPayload } from "@/components/supervisor/StoreActionPlans";
import { CalendarDays, BarChart3, ClipboardList } from "lucide-react";

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

const SupervisorDashboard = () => {
  const { profile } = useAuth();
  const [dailyStores, setDailyStores] = useState<StoreRankingEntry[]>([]);
  const [weeklyStores, setWeeklyStores] = useState<StoreRankingEntry[]>([]);
  const [monthlyStores, setMonthlyStores] = useState<StoreRankingEntry[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [pendingChecklistCount, setPendingChecklistCount] = useState(0);
  const [storesWithoutRecentVisit, setStoresWithoutRecentVisit] = useState<{ id: string; name: string }[]>([]);
  const [storeList, setStoreList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // For triggering action plan creation from alerts
  const [actionTrigger, setActionTrigger] = useState(0);
  const [actionPayload, setActionPayload] = useState<CreateActionPayload | undefined>();

  const today = fmt(new Date());
  const week = useMemo(getWeekRange, []);
  const month = useMemo(getMonthRange, []);

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

      // Stores without recent visit
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
      const cutoffStr = fmt(cutoff);
      const visited = new Set(visitData.filter((v: any) => v.visit_date >= cutoffStr).map((v: any) => v.store_id));
      setStoresWithoutRecentVisit(stores.filter(s => !visited.has(s.id)));

      // Pending checklists
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

  const netConv = monthlyStores.length > 0 ? monthlyStores.reduce((s, st) => s + st.conversion_rate, 0) / monthlyStores.length : 0;
  const netTicket = monthlyStores.length > 0
    ? monthlyStores.filter(s => s.won_sales > 0).reduce((s, st) => s + st.avg_ticket, 0) / (monthlyStores.filter(s => s.won_sales > 0).length || 1) : 0;

  const handleCreateFromAlert = (payload: CreateActionPayload) => {
    setActionPayload(payload);
    setActionTrigger(t => t + 1);
  };

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
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Painel do Supervisor</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o desempenho das lojas e gerencie suas visitas</p>
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
              <motion.div {...fadeUp}>
                <SupervisorHighlights stores={monthlyStores} />
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
                <SupervisorStoreAlerts
                  stores={monthlyStores}
                  networkAvgConversion={netConv}
                  networkAvgTicket={netTicket}
                  storesWithoutRecentVisit={storesWithoutRecentVisit}
                  onCreateAction={handleCreateFromAlert}
                />
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
                <StoreActionPlans
                  stores={storeList}
                  externalTrigger={actionTrigger}
                  externalPayload={actionPayload}
                />
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                <SupervisorPendingActions actions={pendingActions} pendingChecklistCount={pendingChecklistCount} />
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
                <SupervisorStoreRanking daily={dailyStores} weekly={weeklyStores} monthly={monthlyStores} />
              </motion.div>
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
