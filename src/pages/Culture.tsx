import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pencil, Target, Eye, Heart } from "lucide-react";
import { toast } from "sonner";

interface CultureRow {
  id: string;
  organization_id: string;
  mission: string;
  vision: string;
  values: string;
}

const Culture = () => {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const [editing, setEditing] = useState(false);
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState("");

  const { data: culture, isLoading } = useQuery({
    queryKey: ["culture"],
    queryFn: async () => {
      const { data, error } = await supabase.from("culture").select("*").maybeSingle();
      if (error) throw error;
      return data as CultureRow | null;
    },
  });

  const startEdit = () => {
    setMission(culture?.mission ?? "");
    setVision(culture?.vision ?? "");
    setValues(culture?.values ?? "");
    setEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Sem organização");
      if (culture) {
        const { error } = await supabase
          .from("culture")
          .update({ mission, vision, values, updated_at: new Date().toISOString() })
          .eq("id", culture.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("culture").insert({
          organization_id: profile.organization_id,
          mission,
          vision,
          values,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture"] });
      setEditing(false);
      toast.success("Cultura atualizada");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const items = [
    { icon: Target, label: "Missão", value: culture?.mission, editValue: mission, setEditValue: setMission, color: "text-primary" },
    { icon: Eye, label: "Visão", value: culture?.vision, editValue: vision, setEditValue: setVision, color: "text-blue-500" },
    { icon: Heart, label: "Valores", value: culture?.values, editValue: values, setEditValue: setValues, color: "text-rose-500" },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:pl-72 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cultura</h1>
            <p className="text-sm text-muted-foreground">Missão, Visão e Valores da empresa</p>
          </div>
          {isAdmin && !editing && (
            <Button onClick={startEdit} size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : editing ? (
          <div className="space-y-5">
            {items.map((item) => (
              <div key={item.label} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  {item.label}
                </Label>
                <Textarea
                  value={item.editValue}
                  onChange={(e) => item.setEditValue(e.target.value)}
                  rows={4}
                  placeholder={`Descreva a ${item.label.toLowerCase()}...`}
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : !culture?.mission && !culture?.vision && !culture?.values ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Cultura ainda não definida</p>
            {isAdmin && (
              <Button className="mt-4" onClick={startEdit} size="sm">Definir agora</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) =>
              item.value ? (
                <Card key={item.label} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <h2 className="font-semibold text-foreground">{item.label}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.value}</p>
                </Card>
              ) : null
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Culture;
