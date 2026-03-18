import { motion } from "framer-motion";
import { BarChart3, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";

const mockSales = [
  { id: "1", customer: "Maria Oliveira", value: 1250, status: "won" as const, time: "14:30", driver: "Estilo" },
  { id: "2", customer: "João Pedro", value: 0, status: "lost" as const, time: "11:15", driver: "Preço" },
  { id: "3", customer: "Ana Costa", value: 890, status: "won" as const, time: "10:00", driver: "Qualidade" },
  { id: "4", customer: "Roberto Lima", value: 2140, status: "won" as const, time: "09:30", driver: "Urgência" },
];

const mockRanking = [
  { name: "Ana Silva", sales: 6200, conversion: 78 },
  { name: "Carlos Souza", sales: 4280, conversion: 68 },
  { name: "Julia Santos", sales: 3100, conversion: 55 },
  { name: "Pedro Rocha", sales: 2800, conversion: 50 },
];

const Sales = () => {
  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Vendas
            </h1>
            <p className="text-sm text-muted-foreground">Hoje</p>
          </div>

          {/* Today's Sales */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Atendimentos de Hoje
            </h2>
            <div className="space-y-2">
              {mockSales.map((sale, i) => (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      sale.status === "won" ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sale.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.driver} · {sale.time}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      sale.status === "won" ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {sale.status === "won"
                      ? `R$ ${sale.value.toLocaleString("pt-BR")}`
                      : "Perdido"}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Ranking */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ranking
            </h2>
            <div className="space-y-2">
              {mockRanking.map((seller, i) => (
                <div
                  key={seller.name}
                  className="bg-card rounded-2xl p-4 shadow-card"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary">
                      {i === 0 ? (
                        <Trophy className="h-3.5 w-3.5 text-warning" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {seller.name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      R$ {seller.sales.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={seller.conversion} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {seller.conversion}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Sales;
