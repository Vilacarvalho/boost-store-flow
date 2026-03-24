import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { parseBRL, formatBRL, numberToBRLInput } from "@/lib/currency";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PlanningModeSelector, { type PlanningMode } from "@/components/goal-planner/PlanningModeSelector";
import ViabilityAlerts, { getViabilityAlerts, type ViabilityAlert } from "@/components/goal-planner/ViabilityAlerts";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface CalcResult {
  storeId: string;
  storeName: string;
  breakEven: number;
  previousRevenue: number;
  suggested: number;
  diff: number;
  diffPercent: number;
  appliedValue: number;
  alerts: ViabilityAlert[];
  viabilityStatus: string;
}

function calculateSuggested(
  mode: PlanningMode,
  prevRev: number,
  breakEven: number,
  infl: number,
  mkt: number,
  desired: number
) {
  let projection: number;
  switch (mode) {
    case "conservative":
      projection = prevRev * (1 + infl / 100);
      break;
    case "balanced":
      projection = prevRev * (1 + infl / 100) * (1 + mkt / 100);
      break;
    case "aggressive":
      projection = prevRev * (1 + infl / 100) * (1 + mkt / 100) * (1 + desired / 100);
      break;
  }
  return Math.max(breakEven, projection);
}

function getViabilityStatus(alerts: ViabilityAlert[]): string {
  if (alerts.some((a) => a.type === "danger")) return "aggressive";
  if (alerts.some((a) => a.type === "warning")) return "warning";
  return "viable";
}

interface GoalCalculatorProps {
  onUseSuggested: (storeId: string, storeName: string, value: number) => void;
}

const GoalCalculator = ({ onUseSuggested }: GoalCalculatorProps) => {
  const { profile } = useAuth();

  const [planningMode, setPlanningMode] = useState<PlanningMode>("balanced");
  const [breakEvenInput, setBreakEvenInput] = useState("");
  const [previousRevenueInput, setPreviousRevenueInput] = useState("");
  const [inflationRate, setInflationRate] = useState("0");
  const [marketGrowth, setMarketGrowth] = useState("0");
  const [desiredGrowth, setDesiredGrowth] = useState("0");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [results, setResults] = useState<CalcResult[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["calc-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, city").eq("active", true).order("name");
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["goal-plans-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("goal_plans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!profile,
  });

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s.name])), [stores]);

  const toggleStore = (id: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllStores = () => {
    setSelectedStoreIds((prev) => prev.length === stores.length ? [] : stores.map((s) => s.id));
  };

  const calculate = () => {
    const breakEven = parseBRL(breakEvenInput);
    const prevRev = parseBRL(previousRevenueInput);
    const infl = parseFloat(inflationRate) || 0;
    const mkt = parseFloat(marketGrowth) || 0;
    const desired = parseFloat(desiredGrowth) || 0;

    const targetStores = selectedStoreIds.length > 0
      ? stores.filter((s) => selectedStoreIds.includes(s.id))
      : stores;

    const newResults: CalcResult[] = targetStores.map((store) => {
      const suggested = calculateSuggested(planningMode, prevRev, breakEven, infl, mkt, desired);
      const diff = suggested - prevRev;
      const diffPercent = prevRev > 0 ? (diff / prevRev) * 100 : 0;
      const alerts = getViabilityAlerts(suggested, breakEven, prevRev);
      const viabilityStatus = getViabilityStatus(alerts);

      return {
        storeId: store.id,
        storeName: store.name,
        breakEven,
        previousRevenue: prevRev,
        suggested,
        diff,
        diffPercent,
        appliedValue: suggested,
        alerts,
        viabilityStatus,
      };
    });

    setResults(newResults);
    setCalculated(true);
  };

  const canCalculate = breakEvenInput && previousRevenueInput;

  const allAlerts = useMemo(() => {
    if (results.length === 0) return [];
    return results[0]?.alerts || [];
  }, [results]);

  const modeLabels: Record<string, string> = {
    conservative: "Conservador",
    balanced: "Equilibrado",
    aggressive: "Agressivo",
  };

  const periodOptions = [
    { value: "monthly", label: "Mensal" },
    { value: "quarterly", label: "Trimestral" },
    { value: "semiannual", label: "Semestral" },
    { value: "annual", label: "Anual" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros do Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlanningModeSelector value={planningMode} onChange={setPlanningMode} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lojas</Label>
              <div className="border border-border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedStoreIds.length === stores.length && stores.length > 0}
                    onCheckedChange={selectAllStores}
                  />
                  <span className="text-sm font-medium text-foreground">Todas as lojas</span>
                </div>
                {stores.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStoreIds.includes(s.id)}
                      onCheckedChange={() => toggleStore(s.id)}
                    />
                    <span className="text-sm text-foreground">{s.name}</span>
                    {s.city && <span className="text-xs text-muted-foreground">({s.city})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ponto de Equilíbrio</Label>
              <CurrencyInput value={breakEvenInput} onValueChange={setBreakEvenInput} placeholder="Ex: 100.000,00" />
            </div>
            <div className="space-y-2">
              <Label>Faturamento Anterior</Label>
              <CurrencyInput value={previousRevenueInput} onValueChange={setPreviousRevenueInput} placeholder="Ex: 100.000,00" />
            </div>
            <div className="space-y-2">
              <Label>Inflação (%)</Label>
              <Input type="number" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Crescimento do Mercado (%)</Label>
              <Input type="number" step="0.1" value={marketGrowth} onChange={(e) => setMarketGrowth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Crescimento Desejado (%)</Label>
              <Input type="number" step="0.1" value={desiredGrowth} onChange={(e) => setDesiredGrowth(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea placeholder="Notas sobre o planejamento..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Button onClick={calculate} disabled={!canCalculate} className="w-full sm:w-auto">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Metas
          </Button>
        </CardContent>
      </Card>

      {calculated && allAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ViabilityAlerts alerts={allAlerts} />
        </motion.div>
      )}

      {calculated && results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
               <div className="flex items-center gap-2">
                 <CardTitle className="text-base">Resultado — Sugestão de Meta</CardTitle>
                 <Badge variant="outline" className="text-xs">{modeLabels[planningMode]}</Badge>
                 <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Apenas sugestão</Badge>
               </div>
               <p className="text-xs text-muted-foreground">Clique em "Usar valor" para preencher o formulário da meta oficial. <strong>Nada é salvo automaticamente.</strong></p>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead className="text-right">Pt. Equilíbrio</TableHead>
                      <TableHead className="text-right">Fat. Anterior</TableHead>
                      <TableHead className="text-right">Meta Sugerida</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.storeId}>
                        <TableCell className="font-medium">{r.storeName}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatBRL(r.breakEven)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatBRL(r.previousRevenue)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatBRL(r.suggested)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={r.diff >= 0 ? "text-success" : "text-destructive"}>
                              {formatBRL(r.diff)}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.diffPercent.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={r.viabilityStatus === "viable" ? "default" : r.viabilityStatus === "warning" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {r.viabilityStatus === "viable" ? "Viável" : r.viabilityStatus === "warning" ? "Atenção" : "Agressiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUseSuggested(r.storeId, r.storeName, r.suggested)}
                          >
                            Usar valor
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Histórico de Planejamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum planejamento salvo</p>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead className="text-right">Meta Sugerida</TableHead>
                    <TableHead className="text-right">Meta Aplicada</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>{storeMap.get(h.store_id) || "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{modeLabels[h.planning_mode] || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(Number(h.suggested_goal_value))}</TableCell>
                      <TableCell className="text-right font-medium">
                        {h.applied_goal_value ? formatBRL(Number(h.applied_goal_value)) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(h.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalCalculator;
