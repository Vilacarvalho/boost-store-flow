import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export interface PendingAction {
  id: string;
  store_name: string;
  visit_date: string;
  issue: string;
  action: string;
  responsible: string | null;
  due_date: string | null;
  status: string;
}

interface Props {
  actions: PendingAction[];
  pendingChecklistCount: number;
}

const SupervisorPendingActions = ({ actions, pendingChecklistCount }: Props) => {
  const today = new Date().toISOString().split("T")[0];
  const overdue = actions.filter(a => a.status !== "done" && a.due_date && a.due_date < today);
  const pending = actions.filter(a => a.status !== "done" && (!a.due_date || a.due_date >= today));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Ações e Pendências
        </CardTitle>
        <div className="flex gap-2 pt-1">
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {overdue.length} atrasada{overdue.length > 1 ? "s" : ""}
            </Badge>
          )}
          {pending.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pending.length} pendente{pending.length > 1 ? "s" : ""}
            </Badge>
          )}
          {pendingChecklistCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {pendingChecklistCount} checklist{pendingChecklistCount > 1 ? "s" : ""} pendente{pendingChecklistCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {overdue.length === 0 && pending.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Nenhuma ação pendente
          </div>
        ) : (
          <>
            {overdue.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg px-3 py-2 bg-destructive/10">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{a.store_name}</p>
                    <Badge variant="destructive" className="text-[10px] shrink-0">Atrasada</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{a.issue} → {a.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.responsible || "Sem responsável"} · Prazo: {a.due_date ? format(new Date(a.due_date + "T12:00:00"), "dd/MM") : "—"}
                  </p>
                </div>
              </div>
            ))}
            {pending.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg px-3 py-2 bg-muted/30">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.store_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.issue} → {a.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.responsible || "Sem responsável"} · {a.due_date ? `Prazo: ${format(new Date(a.due_date + "T12:00:00"), "dd/MM")}` : "Sem prazo"}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SupervisorPendingActions;
