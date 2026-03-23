import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateName, validateEmail, normalizeName, normalizeEmail } from "@/lib/validation";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type AppRole = "admin" | "manager" | "seller" | "supervisor" | "super_admin";

interface StoreOption {
  id: string;
  name: string;
}

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  store_id: string | null;
  active: boolean;
  role: AppRole | null;
  manager_can_sell: boolean;
}

interface UserFormState {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AppRole;
  store_id: string;
  manager_can_sell: boolean;
}

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Gerente",
  seller: "Vendedor",
  supervisor: "Supervisor",
};

const isAppRole = (value: string | null | undefined): value is AppRole => {
  return value === "super_admin" || value === "admin" || value === "manager" || value === "seller" || value === "supervisor";
};

const roleNeedsStore = (role: AppRole) => role === "manager" || role === "seller";

const normalizeStoreId = (role: AppRole, storeId: string) => (roleNeedsStore(role) ? storeId : null);

const UsersManagement = () => {
  const { profile, role: myRole, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<UserFormState>({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "seller",
    store_id: "",
    manager_can_sell: false,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as StoreOption[];
    },
    enabled: !!profile,
  });

  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store.name])), [stores]);
  const validStoreIds = useMemo(() => new Set(stores.map((store) => store.id)), [stores]);
  const shouldShowStoreField = roleNeedsStore(form.role);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const nameErr = validateName(form.name);
    if (nameErr) errors.name = nameErr;

    if (isCreating) {
      const emailErr = validateEmail(form.email);
      if (emailErr) errors.email = emailErr;
      if (!form.password || form.password.length < 6) errors.password = "Senha deve ter no mínimo 6 caracteres";
    }

    if (roleNeedsStore(form.role)) {
      if (!form.store_id) errors.store_id = "Gerente e vendedor precisam de uma loja válida.";
      else if (!validStoreIds.has(form.store_id)) errors.store_id = "Selecione uma loja válida antes de salvar.";
    }

    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    return firstError || null;
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", myRole, profile?.store_id],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, name, email, store_id, active, manager_can_sell").eq("active", true).order("name");

      if (myRole === "manager" && profile?.store_id) {
        query = query.eq("store_id", profile.store_id);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      const userIds = (profiles || []).map((item) => item.id);
      let roles: { user_id: string; role: AppRole }[] = [];

      if (userIds.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        if (rolesError) throw rolesError;
        roles = (rolesData || []) as { user_id: string; role: AppRole }[];
      }

      const roleMap = new Map(roles.map((item) => [item.user_id, item.role]));

      return (profiles || []).map((item) => ({
        ...item,
        role: roleMap.get(item.id) ?? null,
        manager_can_sell: (item as any).manager_can_sell ?? false,
      })) as UserWithRole[];
    },
    enabled: !!profile,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateForm();
      if (validationError) throw new Error(validationError);

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: normalizeEmail(form.email),
          password: form.password,
          name: normalizeName(form.name),
          role: form.role,
          store_id: normalizeStoreId(form.role, form.store_id),
          manager_can_sell: form.role === "manager" ? form.manager_can_sell : false,
        },
      });

      if (response.error) throw new Error(response.error.message || "Erro ao criar usuário.");
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      toast.success("Usuário criado com sucesso.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateForm();
      if (validationError) throw new Error(validationError);
      if (!form.id) throw new Error("Usuário inválido para edição.");

      const response = await supabase.functions.invoke("update-user", {
        body: {
          user_id: form.id,
          name: normalizeName(form.name),
          role: form.role,
          store_id: normalizeStoreId(form.role, form.store_id),
          manager_can_sell: form.role === "manager" ? form.manager_can_sell : false,
        },
      });

      if (response.error) throw new Error(response.error.message || "Erro ao atualizar usuário.");
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });

      if (form.id === user?.id) {
        await refreshProfile();
      }

      setDialogOpen(false);
      toast.success("Usuário atualizado com sucesso.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const response = await supabase.functions.invoke("delete-user", {
        body: { user_id: targetId },
      });
      if (response.error) throw new Error(response.error.message || "Erro ao excluir usuário.");
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteTarget(null);
      toast.success("Usuário desativado com sucesso.");
    },
    onError: (error: Error) => {
      setDeleteTarget(null);
      toast.error(error.message);
    },
  });

  const openCreate = () => {
    setIsCreating(true);
    setForm({
      id: "",
      name: "",
      email: "",
      password: "",
      role: "seller",
      store_id: stores[0]?.id || "",
      manager_can_sell: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (selectedUser: UserWithRole) => {
    const resolvedRole = isAppRole(selectedUser.role) ? selectedUser.role : "seller";
    const resolvedStoreId = selectedUser.store_id && validStoreIds.has(selectedUser.store_id) ? selectedUser.store_id : "";

    setIsCreating(false);
    setForm({
      id: selectedUser.id,
      name: selectedUser.name,
      email: selectedUser.email,
      password: "",
      role: resolvedRole,
      store_id: resolvedRole === "manager" || resolvedRole === "seller" ? resolvedStoreId : "",
      manager_can_sell: selectedUser.manager_can_sell ?? false,
    });
    setDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSaveDisabled =
    !form.name.trim() ||
    (isCreating && (!form.email.trim() || !form.password)) ||
    (shouldShowStoreField && !validStoreIds.has(form.store_id)) ||
    isSaving;

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Usuários</h1>
            </div>
            {(myRole === "admin" || myRole === "super_admin") && (
              <Button onClick={openCreate} size="sm">
                <Plus className="mr-1 h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Loja</TableHead>
                    {(myRole === "admin" || myRole === "super_admin") && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((listedUser) => (
                    <TableRow key={listedUser.id}>
                      <TableCell className="font-medium">{listedUser.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{listedUser.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {listedUser.role ? roleLabels[listedUser.role] : "Sem role"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {listedUser.store_id ? storeMap.get(listedUser.store_id) ?? "Loja inválida" : "—"}
                      </TableCell>
                      {(myRole === "admin" || myRole === "super_admin") && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(listedUser)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {listedUser.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir"
                                onClick={() => setDeleteTarget({ id: listedUser.id, name: listedUser.name })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
            <DialogDescription className="sr-only">
              Atualize nome, perfil de acesso e loja do usuário selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                onBlur={() => {
                  const err = validateName(form.name);
                  if (err) setFieldErrors((prev) => ({ ...prev, name: err }));
                }}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            {isCreating && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, email: event.target.value }));
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    onBlur={() => {
                      const err = validateEmail(form.email);
                      if (err) setFieldErrors((prev) => ({ ...prev, email: err }));
                    }}
                  />
                  {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => {
                  const nextRole = value as AppRole;
                  setForm((current) => ({
                    ...current,
                    role: nextRole,
                    store_id: roleNeedsStore(nextRole) ? current.store_id : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {myRole === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shouldShowStoreField && (
              <div className="space-y-2">
                <Label>Loja</Label>
                <Select value={form.store_id} onValueChange={(value) => setForm((current) => ({ ...current, store_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja válida" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => (isCreating ? createMutation.mutate() : updateMutation.mutate())} disabled={isSaveDisabled}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será desativado e perderá acesso ao sistema. Seus dados históricos serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Desativando..." : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default UsersManagement;
