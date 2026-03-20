import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Plus, Pencil, X } from "lucide-react";

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Gerente" },
  { value: "seller", label: "Vendedor" },
] as const;

export interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  organization_id: string;
  allowed_roles: string[];
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
      return (data ?? []).map((d: any) => ({
        ...d,
        description: d.description ?? "",
        allowed_roles: d.allowed_roles ?? ["super_admin", "admin", "supervisor", "manager", "seller"],
      })) as Category[];
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
  const [description, setDescription] = useState("");
  const [allowedRoles, setAllowedRoles] = useState<string[]>(ALL_ROLES.map(r => r.value));

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description);
    setAllowedRoles(cat.allowed_roles);
  };

  const cancelEdit = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setAllowedRoles(ALL_ROLES.map(r => r.value));
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Sem organização");
      const payload: any = { name, description, allowed_roles: allowedRoles };
      if (editId) {
        const { error } = await supabase
          .from("content_categories")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_categories")
          .insert({ ...payload, organization_id: profile.organization_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content_categories"] });
      toast.success(editId ? "Categoria atualizada!" : "Categoria criada!");
      cancelEdit();
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

  const toggleRole = (role: string, checked: boolean) => {
    setAllowedRoles(checked ? [...allowedRoles, role] : allowedRoles.filter(r => r !== role));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" /> Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Form */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <Input
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Perfis com acesso</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map((r) => (
                  <label key={r.value} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={allowedRoles.includes(r.value)}
                      onCheckedChange={(checked) => toggleRole(r.value, !!checked)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!name.trim() || upsertMutation.isPending}
                onClick={() => upsertMutation.mutate()}
                className="gap-1"
              >
                {editId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {editId ? "Salvar" : "Criar"}
              </Button>
              {editId && (
                <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories?.map((cat) => (
              <div key={cat.id} className="p-2.5 rounded-lg border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cat.name}</span>
                    {!cat.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: cat.id, is_active: v })}
                    />
                  </div>
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {cat.allowed_roles.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                  ))}
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
