import { useEffect, useState } from "react";
import { PieChart, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";

const categoryLabels: Record<string, string> = {
  lentes: "Lentes",
  armacao: "Armação",
  solar: "Solar",
  outros: "Outros",
};

const categoryColors: Record<string, string> = {
  lentes: "bg-primary",
  armacao: "bg-warning",
  solar: "bg-success",
  outros: "bg-muted-foreground",
};

interface CategoryData {
  category: string;
  total_value: number;
  count: number;
  avg_ticket: number;
}

interface CategoryAnalyticsProps {
  storeId: string;
  startDate: string;
  endDate: string;
}

const CategoryAnalytics = ({ storeId, startDate, endDate }: CategoryAnalyticsProps) => {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sales } = await supabase
        .from("sales")
        .select("sale_category, total_value, status")
        .eq("store_id", storeId)
        .eq("status", "won")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");

      if (!sales) { setLoading(false); return; }

      const grouped: Record<string, { total: number; count: number }> = {};
      sales.forEach((s: any) => {
        const cat = s.sale_category || "outros";
        if (!grouped[cat]) grouped[cat] = { total: 0, count: 0 };
        grouped[cat].total += s.total_value || 0;
        grouped[cat].count += 1;
      });

      const result: CategoryData[] = Object.entries(grouped)
        .map(([cat, vals]) => ({
          category: cat,
          total_value: vals.total,
          count: vals.count,
          avg_ticket: vals.count > 0 ? vals.total / vals.count : 0,
        }))
        .sort((a, b) => b.total_value - a.total_value);

      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [storeId, startDate, endDate]);

  const totalRevenue = data.reduce((s, d) => s + d.total_value, 0);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento por Categoria</span>
        </div>
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento por Categoria</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
        {data.map((d) => {
          const pct = totalRevenue > 0 ? (d.total_value / totalRevenue) * 100 : 0;
          return (
            <div
              key={d.category}
              className={`${categoryColors[d.category] || "bg-muted-foreground"} transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {data.map((d) => {
          const pct = totalRevenue > 0 ? ((d.total_value / totalRevenue) * 100).toFixed(1) : "0";
          return (
            <div key={d.category} className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${categoryColors[d.category] || "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{categoryLabels[d.category] || d.category}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{formatBRL(d.total_value)}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{pct}%</span>
                  <span>{d.count} vendas</span>
                  <span>TM {formatBRL(d.avg_ticket)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryAnalytics;
