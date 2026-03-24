import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, Plus, Pencil, Trash2, Users, Calculator, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseBRL, formatBRL, numberToBRLInput } from "@/lib/currency";
import { toast } from "sonner";
import DistributionDialog from "@/components/goal-planner/DistributionDialog";
import GoalCalculator from "@/components/goals/GoalCalculator";

const periodLabels: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

const NONE_VALUE = "__none__";

function getDefaultDates(periodType: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periodType) {
    case "weekly": {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split("T")[0],
        end: sunday.toISOString().split("T")[0],
      };
    }
    case "daily":
      return {
        start: now.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0],
      };
    default: {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
  }
}

const GoalsManagement = () => {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("oficial");
  const [form, setForm] = useState({
    id: "",
    target_value: "",
    period_type: "monthly" as "daily" | "weekly" | "monthly",
    store_id: "",
    user_id: "",
    start_date: "",
    end_date: "",
  });

  const [distDialog, setDistDialog] = useState<{
    open: boolean;
    storeId: string;
    storeName: string;
    goalValue: number;
    goalId: string;
  } | null>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-profiles-for-goals"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, store_id").order("name");
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["admin-goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const numericValue = parseBRL(form.target_value);
      if (numericValue <= 0) throw new Error("Valor da meta deve ser maior que zero.");

      const defaultDates = getDefaultDates(form.period_type);
      const startDate = form.start_date || defaultDates.start;
      const endDate = form.end_date || defaultDates.end;

      const payload = {
        target_value: numericValue,
        period_type: form.period_type as any,
        store_id: form.store_id || null,
        user_id: form.user_id && form.user_id !== NONE_VALUE ? form.user_id : null,
        organization_id: profile!.organization_id!,
        start_date: startDate,
        end_date: endDate,
        period_start: startDate,
        source: "manual",
      };

      if (form.id) {
        const { error } = await supabase.from("goals").update(payload).eq("id", form.id);
        if (error) throw error;
        return { id: form.id, isNew: false, payload };
      } else {
        const { data, error } = await supabase.from("goals").insert(payload).select("id").single();
        if (error) throw error;
        return { id: data.id, isNew: true, payload };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
      setDialogOpen(false);
      toast.success(form.id ? "Meta atualizada!" : "Meta criada!");

      if (result.isNew && result.payload.store_id && !result.payload.user_id) {
        const storeName = storeMap.get(result.payload.store_id) || "Loja";
        setDistDialog({
          open: true,
          storeId: result.payload.store_id,
          storeName,
          goalValue: result.payload.target_value,
          goalId: result.id,
        });
      }
    },
    onError: (e: Error) => {
      toast.error("Erro ao salvar meta: " + e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
      toast.success("Meta removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const storeMap = new Map(stores.map((s) => [s.id, s.name]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const openCreate = () => {
    const dates = getDefaultDates("monthly");
    setForm({
      id: "", target_value: "", period_type: "monthly",
      store_id: stores[0]?.id || "", user_id: NONE_VALUE,
      start_date: dates.start, end_date: dates.end,
    });
    setDialogOpen(true);
  };

  const openEdit = (g: any) => {
    setForm({
      id: g.id,
      target_value: numberToBRLInput(Number(g.target_value)),
      period_type: g.period_type,
      store_id: g.store_id || "",
      user_id: g.user_id || NONE_VALUE,
      start_date: g.start_date || "",
      end_date: g.end_date || "",
    });
    setDialogOpen(true);
  };

  const handlePeriodChange = (v: "daily" | "weekly" | "monthly") => {
    const dates = getDefaultDates(v);
    setForm({ ...form, period_type: v, start_date: dates.start, end_date: dates.end });
  };

  const handleUseSuggested = (storeId: string, _storeName: string, value: number) => {
    const dates = getDefaultDates("monthly");
    setForm({
      id: "",
      target_value: numberToBRLInput(value),
      period_type: "monthly",
      store_id: storeId,
      user_id: NONE_VALUE,
      start_date: dates.start,
      end_date: dates.end,
    });
    setActiveTab("oficial");
    setDialogOpen(true);
    toast.info("Valor sugerido aplicado ao formulário. Salve a Meta Oficial para confirmar.", { duration: 5000 });
  };

  const existingGoalForPeriod = goals.find(
    (g) =>
      g.store_id === form.store_id &&
      !g.user_id &&
      g.period_type === form.period_type &&
      g.start_date === form.start_date &&
      g.end_date === form.end_date &&
      g.id !== form.id
  );

  const filteredUsers = users.filter((u) => !form.store_id || u.store_id === form.store_id);
  const canEdit = role === "admin" || role === "manager" || role === "super_admin";

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Metas</h1>
            </div>
            {canEdit && activeTab === "oficial" && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova Meta
              </Button>
            )}
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="oficial" className="gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Meta Oficial
              </TabsTrigger>
              <TabsTrigger value="calculadora" className="gap-1.5">
                <Calculator className="h-3.5 w-3.5" />
                Calculadora
              </TabsTrigger>
            </TabsList>

            <TabsContent value="oficial">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  As metas listadas abaixo são <strong>oficiais e ativas</strong>. Elas alimentam dashboards, rankings e performance.
                </p>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="text-right">Meta (R$)</TableHead>
                        <TableHead className="text-right">Atual (R$)</TableHead>
                        <TableHead>Datas</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Atualizado</TableHead>
                        {canEdit && <TableHead className="w-32" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goals.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <Badge variant="outline">{periodLabels[g.period_type] || g.period_type}</Badge>
                          </TableCell>
                          <TableCell>{g.store_id ? storeMap.get(g.store_id) || "—" : "Rede"}</TableCell>
                          <TableCell>{g.user_id ? userMap.get(g.user_id) || "—" : "Todos"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatBRL(Number(g.target_value))}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatBRL(Number(g.current_value))}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.start_date && g.end_date
                              ? `${new Date(g.start_date + "T12:00:00").toLocaleDateString("pt-BR")} — ${new Date(g.end_date + "T12:00:00").toLocaleDateString("pt-BR")}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {g.source === "planner" ? "Planejador" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(g.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {g.store_id && !g.user_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Distribuir para vendedores"
                                  onClick={() => setDistDialog({
                                    open: true,
                                    storeId: g.store_id!,
                                    storeName: storeMap.get(g.store_id!) || "Loja",
                                    goalValue: Number(g.target_value),
                                    goalId: g.id,
                                  })}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              )}
                              {(role === "admin" || role === "super_admin") && (
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(g.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {goals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            Nenhuma meta cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calculadora">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Esta calculadora apenas <strong>sugere valores</strong>. Nenhuma meta é salva automaticamente. Use o botão "Usar valor" para preencher o formulário e depois salve na aba <strong>Meta Oficial</strong>.
                </p>
              </div>
              <GoalCalculator onUseSuggested={handleUseSuggested} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {existingGoalForPeriod && !form.id && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Já existe uma meta oficial ativa para este período e loja ({formatBRL(Number(existingGoalForPeriod.target_value))}). Salvar uma nova meta <strong>não substituirá</strong> a anterior automaticamente.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <CurrencyInput
                value={form.target_value}
                onValueChange={(v) => setForm({ ...form, target_value: v })}
                placeholder="Ex: 50.000,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={form.period_type} onValueChange={(v: any) => handlePeriodChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v, user_id: NONE_VALUE })}>
                <SelectTrigger><SelectValue placeholder="Toda a rede" /></SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário (opcional)</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Todos (meta da loja)</SelectItem>
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.target_value || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {distDialog && (
        <DistributionDialog
          open={distDialog.open}
          onClose={() => setDistDialog(null)}
          storeId={distDialog.storeId}
          storeName={distDialog.storeName}
          goalValue={distDialog.goalValue}
          organizationId={profile!.organization_id!}
          targetStart={form.start_date || getDefaultDates(form.period_type).start}
          targetEnd={form.end_date || getDefaultDates(form.period_type).end}
          periodType={form.period_type}
          goalPlanId=""
          parentGoalId={distDialog.goalId}
          onDistributed={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
          }}
        />
      )}
    </AppLayout>
  );
};

export default GoalsManagement;
