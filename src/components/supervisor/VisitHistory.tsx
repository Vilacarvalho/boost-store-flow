import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MapPin, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { VisitDetail } from "./VisitDetail";

interface VisitWithActions {
  id: string;
  store_id: string;
  store_name: string;
  visit_date: string;
  notes: string | null;
  action_count: number;
  done_count: number;
  has_checklist: boolean;
}

export const VisitHistory = () => {
  const { profile } = useAuth();
  const [visits, setVisits] = useState<VisitWithActions[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [filterStore, setFilterStore] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadHistory();
  }, [profile?.organization_id]);

  const loadHistory = async () => {
    const [storesRes, visitsRes] = await Promise.all([
      supabase
        .from("stores")
        .select("id, name")
        .eq("organization_id", profile!.organization_id!)
        .eq("active", true),
      supabase
        .from("store_visits")
        .select("*")
        .order("visit_date", { ascending: false }),
    ]);

    const storeList = storesRes.data || [];
    setStores(storeList);
    const storeMap = Object.fromEntries(storeList.map((s) => [s.id, s.name]));

    const enriched: VisitWithActions[] = [];
    for (const v of visitsRes.data || []) {
      const [actionsRes, checklistRes] = await Promise.all([
        supabase.from("visit_actions").select("id, status").eq("visit_id", v.id),
        supabase.from("visit_checklists").select("id").eq("visit_id", v.id).maybeSingle(),
      ]);

      const acts = actionsRes.data || [];
      enriched.push({
        id: v.id,
        store_id: v.store_id,
        store_name: storeMap[v.store_id] || "—",
        visit_date: v.visit_date,
        notes: v.notes,
        action_count: acts.length,
        done_count: acts.filter((a: any) => a.status === "done").length,
        has_checklist: !!checklistRes.data,
      });
    }

    setVisits(enriched);
    setLoading(false);
  };

  if (selectedVisit) {
    return (
      <VisitDetail
        visitId={selectedVisit}
        onBack={() => {
          setSelectedVisit(null);
          loadHistory();
        }}
      />
    );
  }

  const filtered = filterStore === "all" ? visits : visits.filter((v) => v.store_id === filterStore);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Histórico de Visitas</h2>
        <Select value={filterStore} onValueChange={setFilterStore}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma visita encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <Card
              key={v.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedVisit(v.id)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.store_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(v.visit_date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.has_checklist && (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-0.5" /> Checklist
                      </Badge>
                    )}
                    {v.action_count > 0 && (
                      <Badge
                        variant={v.done_count === v.action_count ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {v.done_count}/{v.action_count} ações
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
