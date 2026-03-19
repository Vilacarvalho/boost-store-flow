import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const roleLabels: Record<string, string> = { admin: "Admin", manager: "Gerente", seller: "Vendedor" };

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  store_id: string | null;
  active: boolean;
  role?: string;
  store_name?: string;
}

const UsersManagement = () => {
  const { profile, role: myRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", email: "", password: "", role: "seller", store_id: "" });

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("name");
      if (myRole === "manager" && profile?.store_id) {
        query = query.eq("store_id", profile.store_id);
      }
      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch roles
      const userIds = (profiles || []).map((p) => p.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));

      const storeMap = new Map(stores.map((s) => [s.id, s.name]));

      return (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || "—",
        store_name: p.store_id ? storeMap.get(p.store_id) || "—" : "—",
      })) as UserWithRole[];
    },
    enabled: !!profile && stores.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, name: form.name, role: form.role, store_id: form.store_id || null },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao criar usuário");
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      toast.success("Usuário criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate store_id requirement based on role
      if ((form.role === "manager" || form.role === "seller") && !form.store_id) {
        throw new Error("Gerente e Vendedor precisam ter uma loja atribuída.");
      }

      // Update profile
      const { error: profileErr } = await supabase.from("profiles").update({
        name: form.name,
        store_id: (form.role === "admin" || form.role === "supervisor") ? form.store_id || null : form.store_id,
      }).eq("id", form.id);
      if (profileErr) throw profileErr;

      // Update role: try UPDATE first, fall back to INSERT
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", form.id)
        .maybeSingle();

      if (existingRole) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: form.role as any })
          .eq("user_id", form.id);
        if (roleErr) throw roleErr;
      } else {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: form.id, role: form.role as any });
        if (roleErr) throw roleErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      toast.success("Usuário atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setIsCreating(true);
    setForm({ id: "", name: "", email: "", password: "", role: "seller", store_id: stores[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (u: UserWithRole) => {
    setIsCreating(false);
    setForm({ id: u.id, name: u.name, email: u.email, password: "", role: u.role || "seller", store_id: u.store_id || "" });
    setDialogOpen(true);
  };

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Usuários</h1>
            </div>
            {myRole === "admin" && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Usuário
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
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Loja</TableHead>
                    {myRole === "admin" && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[u.role || ""] || u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.store_name}</TableCell>
                      {myRole === "admin" && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
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
            <DialogTitle>{isCreating ? "Novo Usuário" : "Editar Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {isCreating && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => isCreating ? createMutation.mutate() : updateMutation.mutate()}
              disabled={!form.name || (isCreating && (!form.email || !form.password)) || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UsersManagement;
