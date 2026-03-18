import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle, Clock, Eye } from "lucide-react";

interface AdminStatsProps {
  totalActive: number;
  totalRequired: number;
  expiringSoon: number;
  totalViews: number;
}

export default function AdminStats({ totalActive, totalRequired, expiringSoon, totalViews }: AdminStatsProps) {
  const stats = [
    { label: "Ativos", value: totalActive, icon: FileText, color: "text-primary" },
    { label: "Obrigatórios", value: totalRequired, icon: AlertTriangle, color: "text-destructive" },
    { label: "Expirando", value: expiringSoon, icon: Clock, color: "text-warning" },
    { label: "Visualizações", value: totalViews, icon: Eye, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
