import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/currency";
import { TrendingUp, TrendingDown, Target, ShoppingCart, BarChart3, AlertTriangle, Users } from "lucide-react";
import { StoreDiagnostics } from "./StoreDiagnostics";

interface StoreMetrics {
  store_id: string;
  store_name: string;
  total_sales: number;
  won_sales: number;
  total_value: number;
  avg_ticket: number;
  conversion_rate: number;
  avg_pa: number;
  goal_target: number;
  goal_current: number;
  top_loss_reasons: { reason: string; count: number }[];
  ranking: { seller_name: string; total_value: number; conversion_rate: number }[];
}

export const StoreOverview = () => {
  const { profile } = useAuth();
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadStoreMetrics();
  }, [profile?.organization_id]);

  const loadStoreMetrics = async () => {
    try {
      const { data: storeList } = await supabase
        .from("stores")
        .select("id, name")
        .eq("organization_id", profile!.organization_id!)
        .eq("active", true);

      if (!storeList) return;

      const today = new Date().toISOString().split("T")[0];
      const metrics: StoreMetrics[] = [];

      for (const store of storeList) {
        const [metricsRes, goalRes, lossRes, rankingRes] = await Promise.all([
          supabase.rpc("get_daily_metrics", { _store_id: store.id, _date: today }),
          supabase
            .from("goals")
            .select("target_value, current_value")
            .eq("store_id", store.id)
            .eq("period_type", "monthly")
            .order("period_start", { ascending: false })
            .limit(1),
          supabase
            .from("sales")
            .select("objection_reason")
            .eq("store_id", store.id)
            .eq("status", "lost")
            .not("objection_reason", "is", null),
          supabase.rpc("get_seller_ranking", { _store_id: store.id, _date: today }),
        ]);

        const m = metricsRes.data?.[0];
        const goal = goalRes.data?.[0];

        // Count loss reasons
        const reasonCounts: Record<string, number> = {};
        lossRes.data?.forEach((s: any) => {
          if (s.objection_reason) {
            reasonCounts[s.objection_reason] = (reasonCounts[s.objection_reason] || 0) + 1;
          }
        });
        const topLossReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        metrics.push({
          store_id: store.id,
          store_name: store.name,
          total_sales: m?.total_sales || 0,
          won_sales: m?.won_sales || 0,
          total_value: m?.total_value || 0,
          avg_ticket: m?.avg_ticket || 0,
          conversion_rate: m?.conversion_rate || 0,
          avg_pa: m?.avg_pa || 0,
          goal_target: goal?.target_value || 0,
          goal_current: goal?.current_value || 0,
          top_loss_reasons: topLossReasons,
          ranking: (rankingRes.data || []).slice(0, 3).map((r: any) => ({
            seller_name: r.seller_name,
            total_value: r.total_value,
            conversion_rate: r.conversion_rate,
          })),
        });
      }

      setStores(metrics);
    } catch (err) {
      console.error("Error loading store metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma loja encontrada na sua organização.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {stores.map((store) => (
        <Card key={store.store_id} className="overflow-hidden">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setSelectedStore(selectedStore === store.store_id ? null : store.store_id)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{store.store_name}</CardTitle>
              <Badge variant={store.conversion_rate >= 30 ? "default" : "destructive"}>
                {store.conversion_rate}% conversão
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">{store.total_sales}</p>
                <p className="text-[10px] text-muted-foreground">Atendimentos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">{formatBRL(store.avg_ticket)}</p>
                <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">{store.avg_pa.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">P.A.</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">
                  {store.goal_target > 0
                    ? `${Math.round((store.goal_current / store.goal_target) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Meta</p>
              </div>
            </div>

            {/* Meta progress */}
            {store.goal_target > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Meta: {formatBRL(store.goal_target)}</span>
                  <span>Realizado: {formatBRL(store.goal_current)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min((store.goal_current / store.goal_target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Top Loss Reasons */}
            {store.top_loss_reasons.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Principais Perdas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {store.top_loss_reasons.map((r) => (
                    <Badge key={r.reason} variant="outline" className="text-xs">
                      {r.reason} ({r.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Seller ranking */}
            {store.ranking.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Ranking do Dia
                </p>
                <div className="space-y-1">
                  {store.ranking.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                      <span className="font-medium text-foreground">{i + 1}. {r.seller_name}</span>
                      <span className="text-muted-foreground">
                        {formatBRL(r.total_value)} · {r.conversion_rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostics */}
            {selectedStore === store.store_id && (
              <StoreDiagnostics store={store} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
