import { motion } from "framer-motion";
import { TrendingUp, Target, ShoppingCart, BarChart3, Trophy, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";

// Mock data
const mockUser = { name: "Carlos", role: "seller" };
const mockMetrics = {
  salesTotal: 4280,
  salesCount: 7,
  goalAmount: 8000,
  conversionRate: 68,
  avgTicket: 611.43,
  attendancesTotal: 12,
};

const mockRanking = [
  { name: "Ana Silva", sales: 6200, conversion: 78, position: 1 },
  { name: "Carlos Souza", sales: 4280, conversion: 68, position: 2 },
  { name: "Julia Santos", sales: 3100, conversion: 55, position: 3 },
];

const mockLostAttendances = [
  { customer: "Maria Oliveira", reason: "Preço", time: "14:30" },
  { customer: "João Pedro", reason: "Vai pensar", time: "11:15" },
];

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
  const goalProgress = (mockMetrics.salesTotal / mockMetrics.goalAmount) * 100;
  const remaining = mockMetrics.goalAmount - mockMetrics.salesTotal;

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <motion.div {...fadeUp} className="space-y-1">
            <p className="text-sm text-muted-foreground">Bom dia,</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {mockUser.name} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Você está a{" "}
              <span className="font-semibold text-primary tabular-nums">
                R$ {remaining.toLocaleString("pt-BR")}
              </span>{" "}
              da sua meta do dia.
            </p>
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
                R$ {mockMetrics.salesTotal.toLocaleString("pt-BR")}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                / R$ {mockMetrics.goalAmount.toLocaleString("pt-BR")}
              </span>
            </div>
            <Progress value={goalProgress} className="h-2 rounded-full" />
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
              value={mockMetrics.salesCount.toString()}
              icon={ShoppingCart}
              trend="+2 vs ontem"
            />
            <MetricCard
              label="Conversão"
              value={`${mockMetrics.conversionRate}%`}
              icon={BarChart3}
            />
            <MetricCard
              label="Ticket Médio"
              value={`R$ ${mockMetrics.avgTicket.toFixed(0)}`}
              icon={TrendingUp}
            />
            <MetricCard
              label="Atendimentos"
              value={mockMetrics.attendancesTotal.toString()}
              icon={ShoppingCart}
            />
          </motion.div>

          {/* Ranking */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.15 }}
            className="space-y-3"
          >
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ranking do Dia
            </h2>
            <div className="space-y-2">
              {mockRanking.map((seller) => (
                <div
                  key={seller.name}
                  className={`bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 ${
                    seller.name === mockUser.name ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary">
                    <Trophy
                      className={`h-4 w-4 ${
                        seller.position === 1
                          ? "text-warning"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {seller.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seller.conversion}% conversão
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    R$ {seller.sales.toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Lost Attendances */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Atendimentos Perdidos
            </h2>
            <div className="space-y-2">
              {mockLostAttendances.map((att, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {att.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Motivo: {att.reason}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {att.time}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
