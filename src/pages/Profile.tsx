import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronRight, User, Store, Target, Bell, Users, KeyRound, Building2, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCulture } from "@/hooks/useCulture";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, role, signOut, user } = useAuth();
  const { data: culture } = useCulture();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editPassOpen, setEditPassOpen] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await supabase.functions.invoke("seed-multistore", { body: {} });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Dados multi-loja criados com sucesso!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSeeding(false);
  };

  const roleLabels: Record<string, string> = { super_admin: "Super Admin", admin: "Administrador", manager: "Gerente", seller: "Vendedor", supervisor: "Supervisor" };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSaveName = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nome atualizado!");
    setEditNameOpen(false);
    window.location.reload();
  };

  const handleSavePassword = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    setEditPassOpen(false);
    setPassword("");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "?";

  const menuItems = [
    { label: "Editar Nome", icon: User, onClick: () => { setName(profile?.name || ""); setEditNameOpen(true); } },
    { label: "Alterar Senha", icon: KeyRound, onClick: () => { setPassword(""); setEditPassOpen(true); } },
    { label: "Minhas Metas", icon: Target, onClick: () => navigate("/goals") },
    { label: "Notificações", icon: Bell },
  ];

  const adminItems = [
    { label: "Lojas", icon: Store, onClick: () => navigate("/stores") },
    { label: "Usuários", icon: Users, onClick: () => navigate("/users") },
    { label: "Metas da Rede", icon: Target, onClick: () => navigate("/goals") },
  ];

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">{initials}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{profile?.name || "Usuário"}</h1>
              <p className="text-sm text-muted-foreground">{role ? roleLabels[role] || role : "—"}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </motion.div>

          {/* Menu items */}
          <div className="space-y-1">
            {menuItems.map((item, i) => (
              <motion.button key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>

          {/* Admin section - visible on all devices for admin/manager */}
          {(role === "super_admin" || role === "admin" || role === "manager") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Administração</p>
              <div className="space-y-1">
                {adminItems
                  .filter((item) => role === "admin" || item.label === "Metas da Rede")
                  .map((item, i) => (
                    <motion.button key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.button>
                  ))}
              </div>
            </div>
          )}

          {/* Culture section */}
          {(culture?.mission || culture?.vision || culture?.values) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Nossa Cultura</p>
              <div className="bg-card rounded-2xl p-4 space-y-3">
                {culture.mission && (
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Missão</p>
                      <p className="text-sm text-foreground leading-relaxed">{culture.mission}</p>
                    </div>
                  </div>
                )}
                {culture.vision && (
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Visão</p>
                      <p className="text-sm text-foreground leading-relaxed">{culture.vision}</p>
                    </div>
                  </div>
                )}
                {culture.values && (
                  <div className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Valores</p>
                      <p className="text-sm text-foreground leading-relaxed">{culture.values}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {role === "admin" && (
            <Button variant="outline" size="lg" onClick={handleSeed} disabled={seeding}
              className="w-full justify-start gap-3 rounded-xl">
              <Building2 className="h-5 w-5" />
              {seeding ? "Criando dados multi-loja..." : "🔧 Seed Multi-Loja (teste)"}
            </Button>
          )}

          <Button variant="ghost" size="lg" onClick={handleSignOut}
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl">
            <LogOut className="h-5 w-5" />
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Nome</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveName} disabled={!name || saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={editPassOpen} onOpenChange={setEditPassOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Senha</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPassOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePassword} disabled={password.length < 6 || saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Profile;
