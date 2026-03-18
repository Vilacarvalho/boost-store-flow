import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { parseBRL, formatBRL } from "@/lib/currency";
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
import DistributionDialog from "@/components/goal-planner/DistributionDialog";

const periodOptions = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const formatCurrency = (v: number) => formatBRL(v);

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

interface CalcResult {
  storeId: string;
  storeName: string;
  breakEven: number;
  previousRevenue: number;
  suggested: number;
  diff: number;
  diffPercent: number;
  ruleNote: string;
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

const GoalPlanner = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [periodType, setPeriodType] = useState("monthly");
  const [refStart, setRefStart] = useState("");
  const [refEnd, setRefEnd] = useState("");
  const [targetStart, setTargetStart] = useState("");
  const [targetEnd, setTargetEnd] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("balanced");

  const [breakEvenInput, setBreakEvenInput] = useState("");
  const [previousRevenueInput, setPreviousRevenueInput] = useState("");
  const [inflationRate, setInflationRate] = useState("0");
  const [marketGrowth, setMarketGrowth] = useState("0");
  const [desiredGrowth, setDesiredGrowth] = useState("0");
  const [notes, setNotes] = useState("");

  const [results, setResults] = useState<CalcResult[]>([]);
  const [calculated, setCalculated] = useState(false);

  // Distribution dialog state
  const [distDialog, setDistDialog] = useState<{
    open: boolean;
    storeId: string;
    storeName: string;
    goalValue: number;
    goalPlanId: string;
    parentGoalId: string;
  } | null>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ["planner-stores"],
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

      const ruleNote = alerts.map((a) => a.title).join("; ");

      return {
        storeId: store.id,
        storeName: store.name,
        breakEven,
        previousRevenue: prevRev,
        suggested,
        diff,
        diffPercent,
        ruleNote,
        appliedValue: suggested,
        alerts,
        viabilityStatus,
      };
    });

    setResults(newResults);
    setCalculated(true);
  };

  const updateAppliedValue = (storeId: string, value: string) => {
    setResults((prev) =>
      prev.map((r) => r.storeId === storeId ? { ...r, appliedValue: parseFloat(value) || 0 } : r)
    );
  };

  const applyMutation = useMutation({
    mutationFn: async (storeResults: CalcResult[]) => {
      const orgId = profile!.organization_id!;
      const userId = profile!.id;
      const appliedGoals: { storeId: string; goalPlanId: string; goalId: string; value: number; storeName: string }[] = [];

      for (const r of storeResults) {
        const { data: plan, error: planErr } = await supabase
          .from("goal_plans")
          .insert({
            organization_id: orgId,
            store_id: r.storeId,
            period_type: periodType,
            reference_period_start: refStart,
            reference_period_end: refEnd,
            target_period_start: targetStart,
            target_period_end: targetEnd,
            break_even_value: r.breakEven,
            previous_revenue: r.previousRevenue,
            inflation_rate: parseFloat(inflationRate) || 0,
            market_growth_rate: parseFloat(marketGrowth) || 0,
            desired_growth_rate: parseFloat(desiredGrowth) || 0,
            suggested_goal_value: r.suggested,
            applied_goal_value: r.appliedValue,
            calculation_notes: notes || null,
            created_by: userId,
            planning_mode: planningMode,
            viability_status: r.viabilityStatus,
          } as any)
          .select("id")
          .single();

        if (planErr) throw planErr;

        const { data: goal, error: goalErr } = await supabase.from("goals").insert({
          organization_id: orgId,
          store_id: r.storeId,
          target_value: r.appliedValue,
          period_type: "monthly" as const,
          period_start: targetStart,
          start_date: targetStart,
          end_date: targetEnd,
          source: "planner",
          goal_plan_id: plan.id,
        }).select("id").single();

        if (goalErr) throw goalErr;

        appliedGoals.push({
          storeId: r.storeId,
          goalPlanId: plan.id,
          goalId: goal.id,
          value: r.appliedValue,
          storeName: r.storeName,
        });
      }

      return appliedGoals;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goal-plans-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
      toast.success("Metas aplicadas com sucesso!");

      // If single store, offer distribution
      if (data.length === 1) {
        const g = data[0];
        setDistDialog({
          open: true,
          storeId: g.storeId,
          storeName: g.storeName,
          goalValue: g.value,
          goalPlanId: g.goalPlanId,
          parentGoalId: g.goalId,
        });
      }
    },
    onError: (e: Error) => toast.error("Erro ao aplicar metas: " + e.message),
  });

  const applyAll = () => {
    if (!targetStart || !targetEnd || !refStart || !refEnd) {
      toast.error("Preencha os períodos de referência e alvo.");
      return;
    }
    applyMutation.mutate(results);
  };

  const applySingle = (storeId: string) => {
    if (!targetStart || !targetEnd || !refStart || !refEnd) {
      toast.error("Preencha os períodos de referência e alvo.");
      return;
    }
    const r = results.find((x) => x.storeId === storeId);
    if (r) applyMutation.mutate([r]);
  };

  const canCalculate = breakEvenInput && previousRevenueInput;

  // Aggregate alerts for summary
  const allAlerts = useMemo(() => {
    if (results.length === 0) return [];
    // Show unique alerts from first result (same params = same alerts)
    return results[0]?.alerts || [];
  }, [results]);

  const modeLabels: Record<string, string> = {
    conservative: "Conservador",
    balanced: "Equilibrado",
    aggressive: "Agressivo",
  };

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Planejador de Metas</h1>
              <p className="text-sm text-muted-foreground">Calcule e aplique metas inteligentes por loja</p>
            </div>
          </motion.div>

          {/* Filters & Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parâmetros do Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Planning Mode */}
              <PlanningModeSelector value={planningMode} onChange={setPlanningMode} />

              {/* Period & Store Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Período</Label>
                  <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Period dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Ref. Início</Label>
                  <Input type="date" value={refStart} onChange={(e) => setRefStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ref. Fim</Label>
                  <Input type="date" value={refEnd} onChange={(e) => setRefEnd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Início</Label>
                  <Input type="date" value={targetStart} onChange={(e) => setTargetStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Fim</Label>
                  <Input type="date" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} />
                </div>
              </div>

              {/* Financial inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ponto de Equilíbrio (R$)</Label>
                  <Input type="number" placeholder="Ex: 50000" value={breakEvenInput} onChange={(e) => setBreakEvenInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Faturamento Anterior (R$)</Label>
                  <Input type="number" placeholder="Ex: 80000" value={previousRevenueInput} onChange={(e) => setPreviousRevenueInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Inflação (%)</Label>
                  <Input type="number" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Crescimento do Mercado (%)</Label>
                  <Input type="number" step="0.1" value={marketGrowth} onChange={(e) => setMarketGrowth(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Crescimento Desejado (%) <span className="text-muted-foreground text-xs">opcional</span></Label>
                  <Input type="number" step="0.1" value={desiredGrowth} onChange={(e) => setDesiredGrowth(e.target.value)} />
                </div>
              </div>

              {/* Notes */}
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

          {/* Viability Alerts */}
          {calculated && allAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViabilityAlerts alerts={allAlerts} />
            </motion.div>
          )}

          {/* Results */}
          {calculated && results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Resultado do Cálculo</CardTitle>
                    <Badge variant="outline" className="text-xs">{modeLabels[planningMode]}</Badge>
                  </div>
                  <Button onClick={applyAll} disabled={applyMutation.isPending} size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {applyMutation.isPending ? "Aplicando..." : "Aplicar Todas"}
                  </Button>
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
                          <TableHead className="text-right">Valor Aplicado</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-28" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r) => (
                          <TableRow key={r.storeId}>
                            <TableCell className="font-medium">{r.storeName}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(r.breakEven)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(r.previousRevenue)}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">{formatCurrency(r.suggested)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className={r.diff >= 0 ? "text-success" : "text-destructive"}>
                                  {formatCurrency(r.diff)}
                                </span>
                                <span className="text-xs text-muted-foreground">{formatPercent(r.diffPercent)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-28 text-right"
                                value={r.appliedValue}
                                onChange={(e) => updateAppliedValue(r.storeId, e.target.value)}
                              />
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
                                onClick={() => applySingle(r.storeId)}
                                disabled={applyMutation.isPending}
                              >
                                Aplicar
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
                        <TableHead>Período</TableHead>
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
                            <Badge variant="outline">
                              {periodOptions.find((p) => p.value === h.period_type)?.label || h.period_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{modeLabels[h.planning_mode] || "—"}</span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(h.suggested_goal_value))}</TableCell>
                          <TableCell className="text-right font-medium">
                            {h.applied_goal_value ? formatCurrency(Number(h.applied_goal_value)) : "—"}
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
      </div>

      {/* Distribution Dialog */}
      {distDialog && (
        <DistributionDialog
          open={distDialog.open}
          onClose={() => setDistDialog(null)}
          storeId={distDialog.storeId}
          storeName={distDialog.storeName}
          goalValue={distDialog.goalValue}
          organizationId={profile!.organization_id!}
          targetStart={targetStart}
          targetEnd={targetEnd}
          periodType={periodType}
          goalPlanId={distDialog.goalPlanId}
          parentGoalId={distDialog.parentGoalId}
          onDistributed={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
          }}
        />
      )}
    </AppLayout>
  );
};

export default GoalPlanner;
