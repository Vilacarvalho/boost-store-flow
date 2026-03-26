import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import TurnQueue from "@/components/turn-queue/TurnQueue";

const productTypeLabels: Record<string, string> = {
  solar: "Solar",
  armacao: "Armação",
  lente: "Lente",
};

interface SaleItem {
  id: string;
  customer_name: string;
  total_value: number;
  status: "won" | "lost";
  product_type: string | null;
  products_count: number | null;
  objection_reason: string | null;
  notes: string | null;
  created_at: string;
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

const Sales = () => {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.store_id) return;

    const fetchData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [salesRes, rankingRes] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total_value, status, product_type, products_count, objection_reason, notes, created_at, customers(name)")
          .eq("store_id", profile.store_id!)
          .gte("created_at", today)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_seller_ranking", { _store_id: profile.store_id! }),
      ]);

      if (salesRes.data) {
        setSales(
          salesRes.data.map((s: any) => ({
            id: s.id,
            customer_name: s.customers?.name || "Cliente",
            total_value: s.total_value || 0,
            status: s.status,
            product_type: s.product_type,
            products_count: s.products_count,
            objection_reason: s.objection_reason,
            notes: s.notes,
            created_at: s.created_at,
          }))
        );
      }

      if (rankingRes.data) setRanking(rankingRes.data as RankingEntry[]);
      setLoading(false);
    };

    fetchData();
  }, [profile?.store_id]);

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
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vendas</h1>
            <p className="text-sm text-muted-foreground">Hoje</p>
          </div>

          {/* Turn Queue */}
          {profile?.store_id && (
            <TurnQueue storeId={profile.store_id} />
          )}

          <div className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendimentos de Hoje</h2>
            {sales.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 shadow-card text-center">
                <p className="text-sm text-muted-foreground">Nenhum atendimento hoje ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sales.map((sale, i) => (
                  <motion.div key={sale.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${sale.status === "won" ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sale.customer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {sale.product_type && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {productTypeLabels[sale.product_type] || sale.product_type}
                          </span>
                        )}
                        {sale.status === "won" && sale.products_count ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Package className="h-3 w-3" /> P.A. {sale.products_count}
                          </span>
                        ) : null}
                        {sale.status === "lost" && sale.objection_reason && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                            {sale.objection_reason}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(sale.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${sale.status === "won" ? "text-success" : "text-muted-foreground"}`}>
                      {sale.status === "won" ? formatBRL(sale.total_value) : "Perdido"}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {ranking.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ranking</h2>
              <div className="space-y-2">
                {ranking.map((seller, i) => (
                  <div key={seller.seller_id} className="bg-card rounded-2xl p-4 shadow-card">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary">
                        {i === 0 ? <Trophy className="h-3.5 w-3.5 text-warning" /> : <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{seller.seller_name}</p>
                        <p className="text-xs text-muted-foreground">{seller.conversion_rate}% conv. · P.A. {Number(seller.avg_pa || 0).toFixed(1)}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">{formatBRL(seller.total_value)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={seller.conversion_rate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{seller.conversion_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Sales;
