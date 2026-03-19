import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VisitDetail } from "./VisitDetail";

interface Store {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  store_id: string;
  visit_date: string;
  notes: string | null;
  store_name?: string;
}

export const VisitAgenda = () => {
  const { user, profile } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);

  // Form
  const [storeId, setStoreId] = useState("");
  const [visitDate, setVisitDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadData();
  }, [profile?.organization_id]);

  const loadData = async () => {
    const [storesRes, visitsRes] = await Promise.all([
      supabase
        .from("stores")
        .select("id, name")
        .eq("organization_id", profile!.organization_id!)
        .eq("active", true),
      supabase
        .from("store_visits")
        .select("*")
        .order("visit_date", { ascending: true }),
    ]);

    setStores(storesRes.data || []);

    const visitsWithStore = (visitsRes.data || []).map((v: any) => ({
      ...v,
      store_name: storesRes.data?.find((s) => s.id === v.store_id)?.name || "—",
    }));
    setVisits(visitsWithStore);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!storeId || !visitDate || !user || !profile?.organization_id) {
      toast.error("Preencha loja e data");
      return;
    }

    const { error } = await supabase.from("store_visits").insert({
      organization_id: profile.organization_id,
      store_id: storeId,
      supervisor_id: user.id,
      visit_date: format(visitDate, "yyyy-MM-dd"),
      notes: notes || null,
    });

    if (error) {
      console.error("Insert visit error:", error);
      toast.error("Erro ao criar visita");
      return;
    }

    toast.success("Visita agendada");
    setDialogOpen(false);
    setStoreId("");
    setVisitDate(undefined);
    setNotes("");
    loadData();
  };

  const today = new Date().toISOString().split("T")[0];
  const futureVisits = visits.filter((v) => v.visit_date >= today);
  const pastVisits = visits.filter((v) => v.visit_date < today);

  if (selectedVisit) {
    return (
      <VisitDetail
        visitId={selectedVisit}
        onBack={() => {
          setSelectedVisit(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Agenda de Visitas</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nova Visita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Visita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left", !visitDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {visitDate ? format(visitDate, "dd/MM/yyyy") : "Data da visita"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={visitDate}
                    onSelect={setVisitDate}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Textarea
                placeholder="Observações (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button className="w-full" onClick={handleCreate}>
                Agendar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Future visits */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Próximas Visitas</p>
            {futureVisits.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma visita agendada
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {futureVisits.map((v) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedVisit(v.id)}
                  >
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.store_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(v.visit_date + "T12:00:00"), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past visits */}
          {pastVisits.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Visitas Anteriores</p>
              <div className="space-y-2">
                {pastVisits.map((v) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors opacity-70"
                    onClick={() => setSelectedVisit(v.id)}
                  >
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.store_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(v.visit_date + "T12:00:00"), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
