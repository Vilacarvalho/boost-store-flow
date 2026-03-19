import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, ShoppingCart, BarChart3, AlertTriangle, Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";

interface Metrics {
  total_sales: number;
  won_sales: number;
  total_value: number;
  avg_ticket: number;
  conversion_rate: number;
  total_attendances: number;
  avg_pa: number;
}

interface RankingEntry {
  seller_id: string;
  seller_name: string;
  total_value: number;
  won_count: number;
  total_count: number;
  conversion_rate: number;
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

const ManagerDashboard = () => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalCurrent, setGoalCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.store_id) {
      setLoading(false);
      return;
    }
    loadData();
  }, [profile?.store_id, user]);

  const loadData = async () => {
    try {
      const storeId = profile!.store_id!;
      const today = new Date().toISOString().split("T")[0];

      const [metricsRes, rankingRes, lostRes, goalRes] = await Promise.all([
        supabase.rpc("get_daily_metrics", { _store_id: storeId }),
        supabase.rpc("get_seller_ranking", { _store_id: storeId }),
        supabase
          .from("sales")
          .select("objection_reason, created_at, customers(name)")
          .eq("store_id", storeId)
          .eq("status", "lost")
          .gte("created_at", today)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("goals")
          .select("target_value, current_value")
          .eq("store_id", storeId)
          .is("user_id", null)
          .eq("period_type", "monthly")
          .order("period_start", { ascending: false })
          .limit(1),
      ]);

      if (metricsRes.data?.[0]) {
        setMetrics(metricsRes.data[0] as Metrics);
      } else {
        setMetrics({ total_sales: 0, won_sales: 0, total_value: 0, avg_ticket: 0, conversion_rate: 0, total_attendances: 0, avg_pa: 0 });
      }

      if (rankingRes.data) setRanking(rankingRes.data as RankingEntry[]);

      if (lostRes.data) {
        setLostSales(lostRes.data.map((s: any) => ({
          customer_name: s.customers?.name || "Cliente",
          objection_reason: s.objection_reason || "Não informado",
          created_at: s.created_at,
        })));
      }

      const goal = goalRes.data?.[0];
      if (goal) {
        setGoalTarget(goal.target_value);
        setGoalCurrent(goal.current_value);
      }
    } catch (err) {
      console.error("Error loading manager dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const goalProgress = goalTarget > 0 ? (goalCurrent / goalTarget) * 100 : 0;

  // Projection
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayElapsed = now.getDate();
  const projectedValue = dayElapsed > 0 ? (goalCurrent / dayElapsed) * daysInMonth : 0;

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
              Painel do Gerente
            </h1>
            <p className="text-sm text-muted-foreground">
              Desempenho da sua loja hoje
            </p>
          </motion.div>

          {/* Store Goal Progress */}
          {goalTarget > 0 && (
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Meta da Loja (Mensal)
                </span>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {formatBRL(goalCurrent)}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  / {formatBRL(goalTarget)}
                </span>
              </div>
              <Progress value={Math.min(goalProgress, 100)} className="h-2 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{goalProgress.toFixed(0)}% atingido</span>
                <span>Projeção: {formatBRL(projectedValue)}</span>
              </div>
            </motion.div>
          )}

          {/* KPI Grid */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatBRL(metrics?.total_value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversão</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {metrics?.conversion_rate || 0}%
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatBRL(metrics?.avg_ticket || 0)}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">P.A. Médio</span>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {(metrics?.avg_pa || 0).toFixed(1)}
              </p>
            </div>
          </motion.div>

          {/* Seller Ranking */}
          {ranking.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ranking de Vendedores (Hoje)
              </h2>
              <div className="space-y-2">
                {ranking.map((seller, i) => (
                  <div key={seller.seller_id} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary">
                      {i === 0 ? (
                        <Trophy className="h-4 w-4 text-warning" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{seller.seller_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {seller.conversion_rate}% conv. · P.A. {Number(seller.avg_pa || 0).toFixed(1)} · {seller.won_count}/{seller.total_count} vendas
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatBRL(seller.total_value)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Lost Sales */}
          {lostSales.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Principais Perdas (Hoje)
              </h2>
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
