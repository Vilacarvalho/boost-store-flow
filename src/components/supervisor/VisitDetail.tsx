import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface VisitDetailProps {
  visitId: string;
  onBack: () => void;
}

interface Checklist {
  id?: string;
  follows_process: boolean;
  attempted_closing: boolean;
  system_usage: boolean;
  campaign_active: boolean;
  notes: string;
}

interface Action {
  id: string;
  issue: string;
  action: string;
  responsible: string;
  due_date: string | null;
  status: string;
}

export const VisitDetail = ({ visitId, onBack }: VisitDetailProps) => {
  const [visit, setVisit] = useState<any>(null);
  const [storeName, setStoreName] = useState("");
  const [checklist, setChecklist] = useState<Checklist>({
    follows_process: false,
    attempted_closing: false,
    system_usage: false,
    campaign_active: false,
    notes: "",
  });
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  // New action form
  const [showActionForm, setShowActionForm] = useState(false);
  const [newIssue, setNewIssue] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newResponsible, setNewResponsible] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    loadVisit();
  }, [visitId]);

  const loadVisit = async () => {
    const [visitRes, checklistRes, actionsRes] = await Promise.all([
      supabase.from("store_visits").select("*").eq("id", visitId).single(),
      supabase.from("visit_checklists").select("*").eq("visit_id", visitId).maybeSingle(),
      supabase.from("visit_actions").select("*").eq("visit_id", visitId).order("created_at"),
    ]);

    if (visitRes.data) {
      setVisit(visitRes.data);
      const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", visitRes.data.store_id)
        .single();
      setStoreName(store?.name || "");
    }

    if (checklistRes.data) {
      setChecklistId(checklistRes.data.id);
      setChecklist({
        follows_process: checklistRes.data.follows_process || false,
        attempted_closing: checklistRes.data.attempted_closing || false,
        system_usage: checklistRes.data.system_usage || false,
        campaign_active: checklistRes.data.campaign_active || false,
        notes: checklistRes.data.notes || "",
      });
    }

    setActions((actionsRes.data as Action[]) || []);
    setLoading(false);
  };

  const saveChecklist = async () => {
    const payload = {
      visit_id: visitId,
      follows_process: checklist.follows_process,
      attempted_closing: checklist.attempted_closing,
      system_usage: checklist.system_usage,
      campaign_active: checklist.campaign_active,
      notes: checklist.notes || null,
    };

    let error;
    if (checklistId) {
      ({ error } = await supabase.from("visit_checklists").update(payload).eq("id", checklistId));
    } else {
      const res = await supabase.from("visit_checklists").insert(payload).select().single();
      error = res.error;
      if (res.data) setChecklistId(res.data.id);
    }

    if (error) {
      console.error("Checklist save error:", error);
      toast.error("Erro ao salvar checklist");
    } else {
      toast.success("Checklist salvo");
    }
  };

  const addAction = async () => {
    if (!newIssue || !newAction) {
      toast.error("Preencha problema e ação");
      return;
    }

    const { error } = await supabase.from("visit_actions").insert({
      visit_id: visitId,
      issue: newIssue,
      action: newAction,
      responsible: newResponsible || null,
      due_date: newDueDate || null,
      status: "pending",
    });

    if (error) {
      console.error("Action insert error:", error);
      toast.error("Erro ao criar ação");
    } else {
      toast.success("Ação registrada");
      setNewIssue("");
      setNewAction("");
      setNewResponsible("");
      setNewDueDate("");
      setShowActionForm(false);
      loadVisit();
    }
  };

  const updateActionStatus = async (actionId: string, status: string) => {
    const { error } = await supabase
      .from("visit_actions")
      .update({ status })
      .eq("id", actionId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      loadVisit();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    if (s === "in_progress") return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
    return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusLabel = (s: string) => {
    if (s === "done") return "Concluído";
    if (s === "in_progress") return "Em andamento";
    return "Pendente";
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{storeName}</h2>
        <p className="text-sm text-muted-foreground">
          {visit && format(new Date(visit.visit_date + "T12:00:00"), "dd/MM/yyyy")}
        </p>
        {visit?.notes && <p className="text-sm text-muted-foreground mt-1">{visit.notes}</p>}
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de Visita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "follows_process" as const, label: "Equipe segue o processo de vendas?" },
            { key: "attempted_closing" as const, label: "Tentativa de fechamento sendo feita?" },
            { key: "system_usage" as const, label: "Equipe utilizando o sistema?" },
            { key: "campaign_active" as const, label: "Campanha ativa sendo aplicada?" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <Checkbox
                id={item.key}
                checked={checklist[item.key]}
                onCheckedChange={(checked) =>
                  setChecklist((prev) => ({ ...prev, [item.key]: !!checked }))
                }
              />
              <Label htmlFor={item.key} className="text-sm">
                {item.label}
              </Label>
            </div>
          ))}

          <Textarea
            placeholder="Observações do checklist"
            value={checklist.notes}
            onChange={(e) => setChecklist((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <Button size="sm" onClick={saveChecklist}>
            Salvar Checklist
          </Button>
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plano de Ação</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowActionForm(!showActionForm)}>
              <Plus className="h-4 w-4 mr-1" /> Ação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showActionForm && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Input
                placeholder="Problema identificado"
                value={newIssue}
                onChange={(e) => setNewIssue(e.target.value)}
              />
              <Input
                placeholder="Ação recomendada"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
              />
              <Input
                placeholder="Responsável"
                value={newResponsible}
                onChange={(e) => setNewResponsible(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Prazo"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addAction}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowActionForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {actions.length === 0 && !showActionForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma ação registrada
            </p>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => (
                <div key={a.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{a.issue}</p>
                      <p className="text-xs text-muted-foreground">{a.action}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {statusIcon(a.status)}
                      <span className="text-xs text-muted-foreground">{statusLabel(a.status)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{a.responsible || "Sem responsável"}</span>
                    <span>{a.due_date ? format(new Date(a.due_date + "T12:00:00"), "dd/MM/yyyy") : "Sem prazo"}</span>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={(val) => updateActionStatus(a.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
