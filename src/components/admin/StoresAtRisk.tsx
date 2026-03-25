import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface StoreMetric {
  id: string;
  name: string;
  total_value: number;
  total_sales: number;
  conversion_rate: number;
  avg_ticket: number;
  goal_target: number;
  goal_current: number;
}

interface StoresAtRiskProps {
  stores: StoreMetric[];
  networkAvgConversion: number;
}

interface RiskItem {
  storeName: string;
  reason: string;
}

const StoresAtRisk = ({ stores, networkAvgConversion }: StoresAtRiskProps) => {
  const risks: RiskItem[] = [];

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayElapsed = now.getDate();

  for (const store of stores) {
    // Below daily rhythm
    if (store.goal_target > 0) {
      const expectedPct = (dayElapsed / daysInMonth) * 100;
      const actualPct = (store.goal_current / store.goal_target) * 100;
      if (actualPct < expectedPct * 0.7) {
        risks.push({ storeName: store.name, reason: "abaixo do ritmo da meta mensal" });
      }
    }

    // No sales today
    if (store.total_sales === 0) {
      risks.push({ storeName: store.name, reason: "sem atendimentos hoje" });
    }

    // Conversion much lower than average
    if (networkAvgConversion > 0 && store.conversion_rate > 0 && store.conversion_rate < networkAvgConversion * 0.6) {
      risks.push({
        storeName: store.name,
        reason: `conversão ${((1 - store.conversion_rate / networkAvgConversion) * 100).toFixed(0)}% menor que média da rede`,
      });
    }
  }

  if (risks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Lojas que Precisam de Atenção
      </h2>
      <div className="space-y-2">
        {risks.map((r, i) => (
          <Card key={i} className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{r.storeName}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.reason}</p>
              </div>
              <Badge variant="destructive" className="text-xs shrink-0">Atenção</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StoresAtRisk;
