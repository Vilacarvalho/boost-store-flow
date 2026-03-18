import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingDown, AlertTriangle, Users, ShoppingBag,
  Target, PieChart as PieChartIcon, Package
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 55%)",
  "hsl(45, 85%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(280, 60%, 55%)",
];

const periodOptions = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta Semana" },
  { value: "monthly", label: "Este Mês" },
  { value: "quarterly", label: "Trimestre" },
];

const productTypeLabels: Record<string, string> = {
  solar: "Solar",
  armacao: "Armação",
  lente: "Lente",
};

const objectionLabels: Record<string, string> = {
  "Modelo indisponível": "Modelo indisponível",
  "Preço": "Preço",
  "Vai comparar": "Vai comparar",
  "Retorna depois": "Retorna depois",
  "Sem receita": "Sem receita",
  "Outro": "Outro",
};

function getPeriodDates(periodType: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];

  switch (periodType) {
    case "today":
      return { start: fmt(now), end: fmt(now) };
    case "week": {
      const day = now.getDay();
      const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun) };
    }
    case "quarterly": {
      const q = Math.floor(m / 3);
      return { start: fmt(new Date(y, q * 3, 1)), end: fmt(new Date(y, q * 3 + 3, 0)) };
    }
    default:
      return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 0)) };
  }
}

interface SaleRow {
  id: string;
  status: string;
  total_value: number | null;
  objection_reason: string | null;
  objection_description: string | null;
  product_type: string | null;
  products_count: number | null;
  seller_id: string;
  store_id: string;
}

interface EntityMetrics {
  name: string;
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
  avgTicket: number;
  totalValue: number;
  avgPa: number;
}

const MetricCard = ({ label, value, sub, icon: Icon, accent, destructive }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean; destructive?: boolean;
}) => (
  <div className="bg-card rounded-2xl p-4 shadow-card space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <Icon className={`h-4 w-4 ${destructive ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <p className={`text-xl font-semibold tracking-tight tabular-nums ${destructive ? "text-destructive" : "text-foreground"}`}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const ConversionAnalysis = () => {
  const { profile, user, role } = useAuth();
  const [periodType, setPeriodType] = useState("monthly");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => getPeriodDates(periodType), [periodType]);

  useEffect(() => {
    if (role !== "admin" && role !== "manager") return;
    supabase.from("stores").select("id, name").eq("active", true).then(({ data }) => {
      if (data) setStores(data);
    });
  }, [role]);

  useEffect(() => {
    if (!profile || !user) return;
    fetchData();
  }, [profile, user, periodType, selectedStoreId, role]);

  const fetchData = async () => {
    setLoading(true);

    let salesQuery = supabase
      .from("sales")
      .select("id, status, total_value, objection_reason, objection_description, product_type, products_count, seller_id, store_id")
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");

    if (role === "seller") {
      salesQuery = salesQuery.eq("seller_id", user!.id);
    } else if (role === "manager") {
      salesQuery = salesQuery.eq("store_id", profile!.store_id!);
    } else if (role === "admin" && selectedStoreId !== "all") {
      salesQuery = salesQuery.eq("store_id", selectedStoreId);
    }

    const { data: salesData } = await salesQuery;
    setSales((salesData || []) as SaleRow[]);

    if (role === "manager" || (role === "admin" && selectedStoreId !== "all")) {
      const storeId = role === "manager" ? profile!.store_id! : selectedStoreId;
      const { data: sellersData } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("active", true);
      setSellers(sellersData || []);
    } else {
      setSellers([]);
    }

    setLoading(false);
  };

  const totalAttendances = sales.length;
  const wonSales = sales.filter(s => s.status === "won");
  const lostSales = sales.filter(s => s.status === "lost");
  const totalWon = wonSales.length;
  const totalLost = lostSales.length;
  const conversionRate = totalAttendances > 0 ? (totalWon / totalAttendances) * 100 : 0;
  const totalWonValue = wonSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const avgTicket = totalWon > 0 ? totalWonValue / totalWon : 0;
  const estimatedLossImpact = totalLost > 0 ? avgTicket * totalLost : 0;
  const avgPa = totalWon > 0 ? wonSales.reduce((sum, s) => sum + (s.products_count || 0), 0) / totalWon : 0;

  // Conversion by product type
  const productTypeMetrics = useMemo(() => {
    const types = ["solar", "armacao", "lente"];
    return types.map(type => {
      const typeSales = sales.filter(s => s.product_type === type);
      const typeWon = typeSales.filter(s => s.status === "won");
      const typeLost = typeSales.filter(s => s.status === "lost");
      return {
        name: productTypeLabels[type] || type,
        total: typeSales.length,
        won: typeWon.length,
        lost: typeLost.length,
        conversionRate: typeSales.length > 0 ? (typeWon.length / typeSales.length) * 100 : 0,
        totalValue: typeWon.reduce((sum, s) => sum + (s.total_value || 0), 0),
      };
    }).filter(t => t.total > 0);
  }, [sales]);

  // Objection reasons breakdown
  const objectionMap = useMemo(() => {
    const map: Record<string, { count: number; descriptions: string[] }> = {};
    lostSales.forEach(s => {
      const reason = s.objection_reason?.trim() || "Não informado";
      if (!map[reason]) map[reason] = { count: 0, descriptions: [] };
      map[reason].count++;
      if (reason === "Outro" && s.objection_description) {
        map[reason].descriptions.push(s.objection_description);
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, value: data.count, descriptions: data.descriptions }));
  }, [sales]);

  // Objection by product type
  const objectionByProduct = useMemo(() => {
    const types = ["solar", "armacao", "lente"];
    return types.map(type => {
      const typeLost = lostSales.filter(s => s.product_type === type);
      const reasons: Record<string, number> = {};
      typeLost.forEach(s => {
        const r = s.objection_reason?.trim() || "Não informado";
        reasons[r] = (reasons[r] || 0) + 1;
      });
      return {
        type: productTypeLabels[type] || type,
        total: typeLost.length,
        reasons,
      };
    }).filter(t => t.total > 0);
  }, [sales]);

  // Entity breakdown (stores or sellers)
  const entityMetrics = useMemo((): EntityMetrics[] => {
    const buildEntity = (name: string, entitySales: SaleRow[]): EntityMetrics => {
      const won = entitySales.filter(s => s.status === "won");
      const lost = entitySales.filter(s => s.status === "lost");
      const wonVal = won.reduce((sum, s) => sum + (s.total_value || 0), 0);
      const pa = won.length > 0 ? won.reduce((sum, s) => sum + (s.products_count || 0), 0) / won.length : 0;
      return {
        name, total: entitySales.length, won: won.length, lost: lost.length,
        conversionRate: entitySales.length > 0 ? (won.length / entitySales.length) * 100 : 0,
        avgTicket: won.length > 0 ? wonVal / won.length : 0,
        totalValue: wonVal, avgPa: pa,
      };
    };

    if (role === "admin" && selectedStoreId === "all") {
      return stores.map(store => buildEntity(store.name, sales.filter(s => s.store_id === store.id)))
        .filter(e => e.total > 0).sort((a, b) => b.conversionRate - a.conversionRate);
    }
    if ((role === "manager" || role === "admin") && sellers.length > 0) {
      return sellers.map(seller => buildEntity(seller.name, sales.filter(s => s.seller_id === seller.id)))
        .filter(e => e.total > 0).sort((a, b) => b.conversionRate - a.conversionRate);
    }
    return [];
  }, [sales, stores, sellers, role, selectedStoreId]);

  // Alerts
  const alerts = useMemo(() => {
    const list: { message: string; type: "warning" | "destructive" }[] = [];
    const priceCount = lostSales.filter(s => s.objection_reason === "Preço").length;
    if (priceCount >= 3) list.push({ message: `Alta perda por preço (${priceCount} casos)`, type: "destructive" });
    if (conversionRate < 20 && totalAttendances >= 5) list.push({ message: `Taxa de conversão muito baixa: ${conversionRate.toFixed(1)}%`, type: "destructive" });
    const compareCount = lostSales.filter(s => s.objection_reason === "Vai comparar").length;
    if (compareCount >= 3) list.push({ message: `${compareCount} clientes saíram para comparar`, type: "warning" });
    return list;
  }, [sales, conversionRate, totalAttendances]);

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
          <motion.div {...fadeUp} className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Análise de Conversão</h1>
            <p className="text-sm text-muted-foreground">Identifique onde as vendas estão sendo perdidas</p>
          </motion.div>

          {/* Filters */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="flex flex-wrap gap-3">
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {role === "admin" && stores.length > 0 && (
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </motion.div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${alert.type === "destructive" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Metric Cards */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Atendimentos" value={totalAttendances.toString()} sub={`${totalWon} ganhas · ${totalLost} perdidas`} icon={Users} />
              <MetricCard label="Conversão" value={`${conversionRate.toFixed(1)}%`} sub={`${totalWon} de ${totalAttendances}`} icon={Target} accent={conversionRate >= 30} destructive={conversionRate < 20 && totalAttendances >= 3} />
              <MetricCard label="Ticket Médio" value={formatBRL(avgTicket)} sub={`Total: ${formatBRL(totalWonValue)}`} icon={ShoppingBag} accent />
              <MetricCard label="P.A. Médio" value={avgPa.toFixed(1)} sub={`Impacto perdas: ${formatBRL(estimatedLossImpact)}`} icon={Package} />
            </div>
          </motion.div>

          {/* Conversion by Product Type */}
          {productTypeMetrics.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.13 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Conversão por Tipo de Produto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={productTypeMetrics} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Conversão"]} />
                      <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]}>
                        {productTypeMetrics.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {productTypeMetrics.map((t, i) => (
                      <div key={i} className="text-center text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{t.won}/{t.total}</p>
                        <p>{t.name}</p>
                        <p className="tabular-nums">{formatBRL(t.totalValue)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Objection chart */}
          {objectionMap.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Motivos de Perda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={objectionMap} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false} fontSize={11}>
                        {objectionMap.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} vendas`, "Quantidade"]} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Descriptions for "Outro" */}
                  {objectionMap.filter(o => o.name === "Outro" && o.descriptions.length > 0).map((o, i) => (
                    <div key={i} className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrições "Outro"</p>
                      {o.descriptions.map((d, j) => (
                        <p key={j} className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5">"{d}"</p>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Objection by product type */}
          {objectionByProduct.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perdas por Tipo de Produto</h2>
              <div className="space-y-2">
                {objectionByProduct.map((p, i) => (
                  <div key={i} className="bg-card rounded-2xl p-4 shadow-card">
                    <p className="text-sm font-medium text-foreground mb-2">{p.type} <span className="text-muted-foreground font-normal">({p.total} perdas)</span></p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(p.reasons).sort((a, b) => b[1] - a[1]).map(([reason, count], j) => (
                        <span key={j} className="text-[10px] font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                          {reason}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Entity breakdown */}
          {entityMetrics.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }} className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {role === "admin" && selectedStoreId === "all" ? "Conversão por Loja" : "Conversão por Vendedor"}
              </h2>

              <Card>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={Math.max(150, entityMetrics.length * 45)}>
                    <BarChart data={entityMetrics} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                      <XAxis type="number" fontSize={11} domain={[0, 100]} unit="%" />
                      <YAxis type="category" dataKey="name" fontSize={11} width={95} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Conversão"]}
                        labelFormatter={(label) => {
                          const entity = entityMetrics.find(e => e.name === label);
                          return entity ? `${label} — ${entity.won}/${entity.total} vendas` : label;
                        }}
                      />
                      <Bar dataKey="conversionRate" radius={[0, 4, 4, 0]}>
                        {entityMetrics.map((entry, i) => (
                          <Cell key={i} fill={entry.conversionRate >= 30 ? "hsl(var(--primary))" : entry.conversionRate >= 15 ? "hsl(45, 85%, 55%)" : "hsl(var(--destructive))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {entityMetrics.map((e, i) => (
                  <div key={i} className="bg-card rounded-2xl p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                      <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${e.conversionRate >= 30 ? "bg-primary/10 text-primary" : e.conversionRate >= 15 ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "bg-destructive/10 text-destructive"}`}>
                        {e.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(e.conversionRate, 100)} className="h-1.5 rounded-full mb-2" />
                    <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <div><p className="font-medium text-foreground tabular-nums">{e.total}</p><p>Atend.</p></div>
                      <div><p className="font-medium text-foreground tabular-nums">{e.won}</p><p>Ganhas</p></div>
                      <div><p className="font-medium text-destructive tabular-nums">{e.lost}</p><p>Perdidas</p></div>
                      <div><p className="font-medium text-foreground tabular-nums">{formatBRL(e.avgTicket)}</p><p>Ticket</p></div>
                      <div className="text-right"><p className="font-medium text-foreground tabular-nums">{e.avgPa.toFixed(1)}</p><p>P.A.</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {totalAttendances === 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 shadow-card text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum atendimento encontrado neste período.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ConversionAnalysis;
