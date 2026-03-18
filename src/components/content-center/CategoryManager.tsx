import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Plus, Pencil } from "lucide-react";

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  organization_id: string;
}

export function useCategories() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["content_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!profile,
  });
}

export default function CategoryManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Sem organização");
      if (editId) {
        const { error } = await supabase
          .from("content_categories")
          .update({ name })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_categories")
          .insert({ name, organization_id: profile.organization_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content_categories"] });
      toast.success(editId ? "Categoria atualizada!" : "Categoria criada!");
      setName("");
      setEditId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("content_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content_categories"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" /> Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={!name.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
            {editId && (
              <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setName(""); }}>
                Cancelar
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{cat.name}</span>
                  {!cat.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditId(cat.id); setName(cat.name); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Switch
                    checked={cat.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: cat.id, is_active: v })}
                  />
                </div>
              </div>
            ))}
            {(!categories || categories.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
