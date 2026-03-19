import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
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
import { parseBRL, formatBRL, numberToBRLInput } from "@/lib/currency";
import { toast } from "sonner";

const periodLabels: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

const NONE_VALUE = "__none__";

const GoalsManagement = () => {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    target_value: "",
    period_type: "daily" as "daily" | "weekly" | "monthly",
    store_id: "",
    user_id: "",
  });

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

      const payload = {
        target_value: numericValue,
        period_type: form.period_type as any,
        store_id: form.store_id || null,
        user_id: form.user_id && form.user_id !== NONE_VALUE ? form.user_id : null,
        organization_id: profile!.organization_id!,
      };

      console.log("[GoalsManagement] Saving goal:", { isEdit: !!form.id, payload });

      if (form.id) {
        const { error } = await supabase.from("goals").update(payload).eq("id", form.id);
        if (error) {
          console.error("[GoalsManagement] Update error:", error);
          throw error;
        }
      } else {
        const { error } = await supabase.from("goals").insert(payload);
        if (error) {
          console.error("[GoalsManagement] Insert error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-goals"] });
      setDialogOpen(false);
      toast.success(form.id ? "Meta atualizada!" : "Meta criada!");
    },
    onError: (e: Error) => {
      console.error("[GoalsManagement] Mutation error:", e);
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
    setForm({ id: "", target_value: "", period_type: "daily", store_id: stores[0]?.id || "", user_id: NONE_VALUE });
    setDialogOpen(true);
  };

  const openEdit = (g: any) => {
    setForm({
      id: g.id,
      target_value: numberToBRLInput(Number(g.target_value)),
      period_type: g.period_type,
      store_id: g.store_id || "",
      user_id: g.user_id || NONE_VALUE,
    });
    setDialogOpen(true);
  };

  const filteredUsers = users.filter((u) => !form.store_id || u.store_id === form.store_id);
  const canEdit = role === "admin" || role === "manager";

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Metas</h1>
            </div>
            {canEdit && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova Meta
              </Button>
            )}
          </motion.div>

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
                    {canEdit && <TableHead className="w-24" />}
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
                      {canEdit && (
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {role === "admin" && (
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma meta cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Select value={form.period_type} onValueChange={(v: any) => setForm({ ...form, period_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
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
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default GoalsManagement;
