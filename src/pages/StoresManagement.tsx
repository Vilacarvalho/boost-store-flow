import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, Plus, Pencil, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface StoreForm {
  id?: string;
  name: string;
  city: string;
  active: boolean;
}

const emptyForm: StoreForm = { name: "", city: "", active: true };

const StoresManagement = () => {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const isAdmin = role === "admin" || role === "super_admin";

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      let query = supabase.from("stores").select("*").order("name");
      if (role === "manager" && profile?.store_id) {
        query = query.eq("id", profile.store_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const saveMutation = useMutation({
    mutationFn: async (f: StoreForm) => {
      if (f.id) {
        const { error } = await supabase
          .from("stores")
          .update({ name: f.name, city: f.city, active: f.active })
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const orgId = profile!.organization_id;
        if (!orgId) throw new Error("Organização não encontrada");
        const { error } = await supabase.from("stores").insert({
          name: f.name,
          city: f.city,
          active: f.active,
          organization_id: orgId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setDialogOpen(false);
      toast.success(form.id ? "Loja atualizada!" : "Loja criada!");
    },
    onError: (e: Error) => toast.error("Erro ao salvar loja. Verifique suas permissões."),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("stores").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success(vars.active ? "Loja ativada!" : "Loja desativada!");
    },
    onError: () => toast.error("Erro ao alterar status da loja."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (storeId: string) => {
      // Safety: check if it's the last store
      if (stores.length <= 1) {
        throw new Error("Não é possível excluir a única loja da organização.");
      }

      // Check for linked profiles (active users)
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("active", true);

      if (usersCount && usersCount > 0) {
        throw new Error("Essa loja possui usuários ativos vinculados. Remova ou transfira os usuários antes de excluir.");
      }

      // Check for linked sales
      const { count: salesCount } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);

      if (salesCount && salesCount > 0) {
        throw new Error("Essa loja possui vendas vinculadas. Desative a loja ao invés de excluí-la.");
      }

      // Check for linked customers
      const { count: customersCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);

      if (customersCount && customersCount > 0) {
        throw new Error("Essa loja possui clientes vinculados. Desative a loja ao invés de excluí-la.");
      }

      const { error } = await supabase.from("stores").delete().eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setDeleteTarget(null);
      toast.success("Loja excluída com sucesso!");
    },
    onError: (e: Error) => {
      setDeleteTarget(null);
      toast.error(e.message);
    },
  });

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: any) => { setForm({ id: s.id, name: s.name, city: s.city || "", active: s.active }); setDialogOpen(true); };

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Lojas</h1>
            </div>
            {isAdmin && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova Loja
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-36 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.city || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "default" : "secondary"}>
                          {s.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={s.active ? "Desativar" : "Ativar"}
                              onClick={() => toggleStatusMutation.mutate({ id: s.id, active: !s.active })}
                              disabled={toggleStatusMutation.isPending}
                            >
                              <Power className={`h-4 w-4 ${s.active ? "text-green-600" : "text-muted-foreground"}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                              onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {stores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma loja cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Loja" : "Nova Loja"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da loja" />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cidade" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A loja só será excluída se não possuir vendas, clientes ou usuários vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default StoresManagement;
