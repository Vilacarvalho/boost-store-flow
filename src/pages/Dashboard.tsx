import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, ShoppingCart, BarChart3, Trophy, AlertTriangle } from "lucide-react";
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
}

interface RankingEntry {
  seller_id: string;
  seller_name: string;
  total_value: number;
  won_count: number;
  total_count: number;
  conversion_rate: number;
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

const MetricCard = ({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}) => (
  <div className="bg-card rounded-2xl p-4 shadow-card space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
      {value}
    </p>
    {trend && (
      <span className="text-xs font-medium text-success">{trend}</span>
    )}
  </div>
);

const Dashboard = () => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [lostSales, setLostSales] = useState<LostSale[]>([]);
  const [goalTarget, setGoalTarget] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.store_id || !user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch metrics
      const { data: metricsData } = await supabase.rpc("get_daily_metrics", {
        _store_id: profile.store_id!,
      });

      if (metricsData && metricsData.length > 0) {
        setMetrics(metricsData[0] as Metrics);
      } else {
        setMetrics({
          total_sales: 0, won_sales: 0, total_value: 0,
          avg_ticket: 0, conversion_rate: 0, total_attendances: 0,
        });
      }

      // Fetch ranking
      const { data: rankingData } = await supabase.rpc("get_seller_ranking", {
        _store_id: profile.store_id!,
      });
      if (rankingData) setRanking(rankingData as RankingEntry[]);

      // Fetch lost sales
      const today = new Date().toISOString().split("T")[0];
      const { data: lostData } = await supabase
        .from("sales")
        .select("objection_reason, created_at, customers(name)")
        .eq("store_id", profile.store_id!)
        .eq("status", "lost")
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(5);

      if (lostData) {
        setLostSales(
          lostData.map((s: any) => ({
            customer_name: s.customers?.name || "Cliente",
            objection_reason: s.objection_reason || "Não informado",
            created_at: s.created_at,
          }))
        );
      }

      // Fetch goal — check user-specific goal first, then store goal, then default
      const { data: userGoal } = await supabase
        .from("goals")
        .select("target_value")
        .eq("user_id", user.id)
        .gte("end_date", today)
        .lte("start_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userGoal) {
        setGoalTarget(userGoal.target_value);
      } else {
        // Fallback to store-level goal
        const { data: storeGoal } = await supabase
          .from("goals")
          .select("target_value")
          .eq("store_id", profile.store_id!)
          .is("user_id", null)
          .gte("end_date", today)
          .lte("start_date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (storeGoal) {
          setGoalTarget(storeGoal.target_value);
        } else {
          // Legacy daily goal fallback
          const { data: dailyGoal } = await supabase
            .from("goals")
            .select("target_value")
            .eq("user_id", user.id)
            .eq("period_type", "daily")
            .eq("period_start", today)
            .maybeSingle();
          setGoalTarget(dailyGoal?.target_value || 5000);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [profile?.store_id, user]);

  const totalValue = metrics?.total_value || 0;
  const goalProgress = goalTarget > 0 ? (totalValue / goalTarget) * 100 : 0;
  const remaining = Math.max(0, goalTarget - totalValue);
  const userName = profile?.name?.split(" ")[0] || "Vendedor";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
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
          {/* Header */}
          <motion.div {...fadeUp} className="space-y-1">
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {userName} 👋
            </h1>
            {remaining > 0 ? (
              <p className="text-sm text-muted-foreground">
                Você está a{" "}
                <span className="font-semibold text-primary tabular-nums">
                  {formatBRL(remaining)}
                </span>{" "}
                da sua meta do dia.
              </p>
            ) : totalValue > 0 ? (
              <p className="text-sm text-success font-medium">
                🎉 Meta do dia atingida!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Inicie um atendimento para começar o dia.
              </p>
            )}
          </motion.div>

          {/* Goal Progress */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.05 }}
            className="bg-card rounded-2xl p-5 shadow-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Meta do Dia
              </span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatBRL(totalValue)}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                / {formatBRL(goalTarget)}
              </span>
            </div>
            <Progress value={Math.min(goalProgress, 100)} className="h-2 rounded-full" />
            <p className="text-xs text-muted-foreground">
              {goalProgress.toFixed(0)}% atingido
            </p>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <MetricCard
              label="Vendas"
              value={(metrics?.won_sales || 0).toString()}
              icon={ShoppingCart}
            />
            <MetricCard
              label="Conversão"
              value={`${metrics?.conversion_rate || 0}%`}
              icon={BarChart3}
            />
            <MetricCard
              label="Ticket Médio"
              value={formatBRL(metrics?.avg_ticket || 0)}
              icon={TrendingUp}
            />
            <MetricCard
              label="Atendimentos"
              value={(metrics?.total_attendances || 0).toString()}
              icon={ShoppingCart}
            />
          </motion.div>

          {/* Ranking */}
          {ranking.length > 0 && (
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="space-y-3"
            >
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ranking do Dia
              </h2>
              <div className="space-y-2">
                {ranking.map((seller, i) => (
                  <div
                    key={seller.seller_id}
                    className={`bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 ${
                      seller.seller_id === user?.id ? "ring-2 ring-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary">
                      {i === 0 ? (
                        <Trophy className="h-4 w-4 text-warning" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {seller.seller_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {seller.conversion_rate}% conversão
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

          {/* Lost Attendances */}
          {lostSales.length > 0 && (
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.2 }}
              className="space-y-3"
            >
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Atendimentos Perdidos
              </h2>
              <div className="space-y-2">
                {lostSales.map((att, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {att.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Motivo: {att.objection_reason}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(att.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {(metrics?.total_attendances || 0) === 0 && (
            <motion.div
              {...fadeUp}
              className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2"
            >
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Nenhum atendimento hoje ainda.
              </p>
              <p className="text-xs text-muted-foreground">
                Toque no botão + para iniciar.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
