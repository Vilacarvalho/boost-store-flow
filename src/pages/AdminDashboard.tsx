import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, ShoppingCart, BarChart3, AlertTriangle,
  Store, Users, Calculator, BookOpen, PieChart, Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";

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

const AdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkGoal, setNetworkGoal] = useState(0);
  const [networkCurrent, setNetworkCurrent] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    loadData();
  }, [profile?.organization_id]);

  const loadData = async () => {
    try {
      const { data: storeList } = await supabase
        .from("stores")
        .select("id, name")
        .eq("organization_id", profile!.organization_id!)
        .eq("active", true);

      if (!storeList || storeList.length === 0) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const storeMetrics: StoreData[] = [];

      for (const store of storeList) {
        const [metricsRes, goalRes] = await Promise.all([
          supabase.rpc("get_daily_metrics", { _store_id: store.id, _date: today }),
          supabase
            .from("goals")
            .select("target_value, current_value")
            .eq("store_id", store.id)
            .is("user_id", null)
            .eq("period_type", "monthly")
            .order("period_start", { ascending: false })
            .limit(1),
        ]);

        const m = metricsRes.data?.[0];
        const goal = goalRes.data?.[0];

        storeMetrics.push({
          id: store.id,
          name: store.name,
          total_value: m?.total_value || 0,
          won_sales: m?.won_sales || 0,
          total_sales: m?.total_sales || 0,
          conversion_rate: m?.conversion_rate || 0,
          avg_ticket: m?.avg_ticket || 0,
          goal_target: goal?.target_value || 0,
          goal_current: goal?.current_value || 0,
        });
      }

      setStores(storeMetrics);

      const totalGoal = storeMetrics.reduce((s, st) => s + st.goal_target, 0);
      const totalCurrent = storeMetrics.reduce((s, st) => s + st.goal_current, 0);
      setNetworkGoal(totalGoal);
      setNetworkCurrent(totalCurrent);
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const networkValue = stores.reduce((s, st) => s + st.total_value, 0);
  const networkSales = stores.reduce((s, st) => s + st.total_sales, 0);
  const networkWon = stores.reduce((s, st) => s + st.won_sales, 0);
  const networkConversion = networkSales > 0 ? ((networkWon / networkSales) * 100) : 0;
  const networkProgress = networkGoal > 0 ? (networkCurrent / networkGoal) * 100 : 0;
  const storesBelowGoal = stores.filter((s) => s.goal_target > 0 && s.goal_current < s.goal_target * 0.7);
  const storesRanked = [...stores].sort((a, b) => b.total_value - a.total_value);

  // Projection: days elapsed / days in month * goal
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayElapsed = now.getDate();
  const projectedValue = dayElapsed > 0 ? (networkCurrent / dayElapsed) * daysInMonth : 0;

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
          {/* Header */}
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão consolidada da rede · {stores.length} loja{stores.length !== 1 ? "s" : ""} ativa{stores.length !== 1 ? "s" : ""}
            </p>
          </motion.div>

          {/* Network Goal Progress */}
          {networkGoal > 0 && (
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Meta da Rede (Mensal)
                </span>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {formatBRL(networkCurrent)}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  / {formatBRL(networkGoal)}
                </span>
              </div>
              <Progress value={Math.min(networkProgress, 100)} className="h-2 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{networkProgress.toFixed(0)}% atingido</span>
                <span>Projeção: {formatBRL(projectedValue)}</span>
              </div>
            </motion.div>
          )}

          {/* Network KPIs */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento Hoje</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{formatBRL(networkValue)}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendimentos</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{networkSales}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversão</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{networkConversion.toFixed(1)}%</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendas</span>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{networkWon}</p>
            </div>
          </motion.div>

          {/* Alerts */}
          {storesBelowGoal.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Alertas Críticos
              </h2>
              <div className="space-y-2">
                {storesBelowGoal.map((s) => (
                  <Card key={s.id} className="bg-destructive/5 border-destructive/20">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.goal_target > 0 ? `${Math.round((s.goal_current / s.goal_target) * 100)}% da meta` : "Sem meta"}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">Abaixo da meta</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Store Ranking */}
          {storesRanked.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ranking de Lojas (Hoje)
              </h2>
              <div className="space-y-2">
                {storesRanked.map((store, i) => (
                  <div key={store.id} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary">
                      {i === 0 ? (
                        <Trophy className="h-4 w-4 text-warning" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.conversion_rate}% conv. · {store.total_sales} atend.
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatBRL(store.total_value)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }} className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Acessos Rápidos
            </h2>
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
