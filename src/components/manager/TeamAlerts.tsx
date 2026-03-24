import { AlertTriangle, TrendingDown, UserX } from "lucide-react";
import { RankingEntry } from "@/components/dashboard/SellerRankingTabs";
import { formatBRL } from "@/lib/currency";

interface TeamAlertsProps {
  dailyRanking: RankingEntry[];
  dailyGoal: number;
  storeAvgConversion: number;
  storeAvgTicket: number;
}

interface Alert {
  seller: string;
  message: string;
  icon: React.ElementType;
}

const TeamAlerts = ({ dailyRanking, dailyGoal, storeAvgConversion, storeAvgTicket }: TeamAlertsProps) => {
  const alerts: Alert[] = [];

  dailyRanking.forEach((s) => {
    if (s.total_count === 0) {
      alerts.push({ seller: s.seller_name, message: "Sem atendimentos hoje", icon: UserX });
    } else {
      if (dailyGoal > 0 && s.total_value < dailyGoal * 0.5) {
        alerts.push({ seller: s.seller_name, message: `Abaixo de 50% da meta diária (${formatBRL(s.total_value)})`, icon: AlertTriangle });
      }
      if (storeAvgConversion > 0 && s.conversion_rate < storeAvgConversion * 0.8) {
        alerts.push({ seller: s.seller_name, message: `Conversão ${s.conversion_rate}% abaixo da média (${storeAvgConversion.toFixed(1)}%)`, icon: TrendingDown });
      }
      if (storeAvgTicket > 0 && (s.avg_ticket || 0) < storeAvgTicket * 0.7) {
        alerts.push({ seller: s.seller_name, message: `Ticket médio ${formatBRL(s.avg_ticket || 0)} abaixo da média`, icon: TrendingDown });
      }
    }
  });

  if (!alerts.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        Alertas da Equipe ({alerts.length})
      </h2>
      <div className="space-y-2">
        {alerts.slice(0, 6).map((a, i) => (
          <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10 shrink-0">
              <a.icon className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.seller}</p>
              <p className="text-xs text-muted-foreground">{a.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamAlerts;
