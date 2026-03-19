import { AlertTriangle, TrendingDown, ShoppingCart, Package } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DiagnosticProps {
  store: {
    conversion_rate: number;
    total_sales: number;
    won_sales: number;
    avg_pa: number;
    top_loss_reasons: { reason: string; count: number }[];
  };
}

export const StoreDiagnostics = ({ store }: DiagnosticProps) => {
  const alerts: { icon: any; title: string; desc: string; variant: "default" | "destructive" }[] = [];

  if (store.conversion_rate < 20 && store.total_sales > 0) {
    alerts.push({
      icon: TrendingDown,
      title: "Conversão Baixa",
      desc: `Taxa de ${store.conversion_rate}% está abaixo do esperado. Verifique o processo de vendas da equipe.`,
      variant: "destructive",
    });
  }

  const priceCount = store.top_loss_reasons.find((r) => r.reason.toLowerCase().includes("preço"))?.count || 0;
  if (priceCount >= 3) {
    alerts.push({
      icon: AlertTriangle,
      title: "Alta Perda por Preço",
      desc: `${priceCount} perdas por preço. Avalie estratégia de precificação ou técnicas de contorno de objeção.`,
      variant: "destructive",
    });
  }

  if (store.total_sales > 5 && store.won_sales === 0) {
    alerts.push({
      icon: ShoppingCart,
      title: "Atendimentos Sem Fechamento",
      desc: `${store.total_sales} atendimentos sem nenhuma venda. Reforce técnica de fechamento.`,
      variant: "destructive",
    });
  }

  if (store.avg_pa > 4) {
    alerts.push({
      icon: Package,
      title: "Excesso de Produtos Apresentados",
      desc: `P.A. de ${store.avg_pa.toFixed(1)} está alto. Pode estar confundindo o cliente com opções demais.`,
      variant: "default",
    });
  }

  if (alerts.length === 0) {
    return (
      <Alert>
        <AlertTitle>✅ Sem alertas</AlertTitle>
        <AlertDescription>Nenhum diagnóstico crítico identificado para esta loja hoje.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Diagnóstico Automático</p>
      {alerts.map((a, i) => (
        <Alert key={i} variant={a.variant}>
          <a.icon className="h-4 w-4" />
          <AlertTitle>{a.title}</AlertTitle>
          <AlertDescription className="text-xs">{a.desc}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
