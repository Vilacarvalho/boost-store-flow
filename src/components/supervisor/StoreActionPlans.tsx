import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ClipboardCheck, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export interface ActionPlan {
  id: string;
  store_id: string;
  store_name?: string;
  issue: string;
  action: string;
  responsible: string | null;
  due_date: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

export interface CreateActionPayload {
  storeId?: string;
  storeName?: string;
  issue?: string;
  source?: string;
}

interface Props {
  stores: { id: string; name: string }[];
  onRefresh?: () => void;
  readOnly?: boolean;
  storeFilter?: string;
}

const StoreActionPlans = ({ stores, onRefresh, readOnly = false, storeFilter }: Props) => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formStoreId, setFormStoreId] = useState("");
  const [formIssue, setFormIssue] = useState("");
  const [formAction, setFormAction] = useState("");
  const [formResponsible, setFormResponsible] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formSource, setFormSource] = useState("");

  useEffect(() => {
    if (profile?.organization_id) loadPlans();
  }, [profile?.organization_id]);

  const loadPlans = async () => {
    let query = supabase
      .from("store_action_plans")
      .select("*")
      .eq("organization_id", profile!.organization_id!)
      .order("created_at", { ascending: false });

    if (storeFilter) {
      query = query.eq("store_id", storeFilter);
    }

    const { data } = await query;
    const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));
    setPlans(
      (data || []).map((p: any) => ({ ...p, store_name: storeMap[p.store_id] || "—" }))
    );
    setLoading(false);
  };

  const openCreateDialog = (payload?: CreateActionPayload) => {
    setFormStoreId(payload?.storeId || "");
    setFormIssue(payload?.issue || "");
    setFormAction("");
    setFormResponsible("");
    setFormDueDate("");
    setFormSource(payload?.source || "");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formStoreId || !formIssue || !formAction) {
      toast.error("Preencha loja, problema e ação");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("store_action_plans").insert({
      organization_id: profile!.organization_id!,
      store_id: formStoreId,
      created_by: user!.id,
      issue: formIssue,
      action: formAction,
      responsible: formResponsible || null,
      due_date: formDueDate || null,
      status: "open",
      source: formSource || null,
    });

    setSaving(false);
    if (error) {
      console.error("Action plan insert error:", error);
      toast.error("Erro ao criar plano de ação");
      return;
    }
    toast.success("Plano de ação criado");
    setDialogOpen(false);
    loadPlans();
    onRefresh?.();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("store_action_plans")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      loadPlans();
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const overdue = plans.filter(p => p.status !== "done" && p.due_date && p.due_date < today);
  const open = plans.filter(p => p.status === "open" && (!p.due_date || p.due_date >= today));
  const inProgress = plans.filter(p => p.status === "in_progress");
  const recentDone = plans.filter(p => p.status === "done").slice(0, 5);

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
    if (s === "in_progress") return <Clock className="h-3.5 w-3.5 text-amber-600" />;
    return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusLabel = (s: string) => {
    if (s === "done") return "Concluído";
    if (s === "in_progress") return "Em andamento";
    return "Aberto";
  };

  const renderPlanItem = (p: ActionPlan, isOverdue = false) => (
    <div
      key={p.id}
      className={`rounded-lg px-3 py-2.5 space-y-1.5 ${isOverdue ? "bg-destructive/10" : "bg-muted/30"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{p.store_name}</p>
            {isOverdue && <Badge variant="destructive" className="text-[10px] shrink-0">Atrasada</Badge>}
            {p.source && <Badge variant="outline" className="text-[10px] shrink-0">{p.source}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{p.issue}</p>
          <p className="text-xs text-foreground/80 mt-0.5">→ {p.action}</p>
        </div>
        {!readOnly && (
          <Select value={p.status} onValueChange={(val) => updateStatus(p.id, val)}>
            <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
            </SelectContent>
          </Select>
        )}
        {readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            {statusIcon(p.status)}
            <span className="text-xs text-muted-foreground">{statusLabel(p.status)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{p.responsible || "Sem responsável"}</span>
        <span>{p.due_date ? `Prazo: ${format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy")}` : "Sem prazo"}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Planos de Ação
              {(overdue.length + open.length + inProgress.length) > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({overdue.length + open.length + inProgress.length} pendente{(overdue.length + open.length + inProgress.length) > 1 ? "s" : ""})
                </span>
              )}
            </CardTitle>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => openCreateDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
            )}
          </div>
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-xs w-fit mt-1">
              {overdue.length} atrasada{overdue.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {overdue.length === 0 && open.length === 0 && inProgress.length === 0 && recentDone.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum plano de ação registrado.
            </p>
          ) : (
            <>
              {overdue.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-destructive">Atrasadas</p>
                  {overdue.map(p => renderPlanItem(p, true))}
                </div>
              )}
              {inProgress.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Em andamento</p>
                  {inProgress.map(p => renderPlanItem(p))}
                </div>
              )}
              {open.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Abertas</p>
                  {open.map(p => renderPlanItem(p))}
                </div>
              )}
              {recentDone.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Concluídas recentemente</p>
                  {recentDone.map(p => renderPlanItem(p))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Plano de Ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={formStoreId} onValueChange={setFormStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Problema identificado"
              value={formIssue}
              onChange={(e) => setFormIssue(e.target.value)}
            />
            <Textarea
              placeholder="Ação proposta"
              value={formAction}
              onChange={(e) => setFormAction(e.target.value)}
            />
            <Input
              placeholder="Responsável"
              value={formResponsible}
              onChange={(e) => setFormResponsible(e.target.value)}
            />
            <Input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />

            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Plano de Ação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { StoreActionPlans, type CreateActionPayload };
export default StoreActionPlans;
