import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Store, Users, Target, CheckCircle2, ChevronLeft, ChevronRight, Loader2,
  Plus, Trash2, Rocket, Upload, X, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateName, normalizeName } from "@/lib/validation";
import { formatBRL } from "@/lib/currency";
import { getDashboardByRole } from "@/lib/roleRedirect";

interface StoreEntry {
  name: string;
  city: string;
}

interface TeamEntry {
  name: string;
  email: string;
  password: string;
  role: "manager" | "seller";
  store_name: string;
  manager_can_sell: boolean;
}

interface GoalEntry {
  store_name: string;
  target_value: number;
}

const STEPS = [
  { icon: Building2, label: "Empresa" },
  { icon: Store, label: "Lojas" },
  { icon: Users, label: "Equipe" },
  { icon: Target, label: "Metas" },
  { icon: CheckCircle2, label: "Revisão" },
];

const NetworkSetup = () => {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Company
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 2: Stores
  const [stores, setStores] = useState<StoreEntry[]>([{ name: "", city: "" }]);

  // Step 3: Team
  const [team, setTeam] = useState<TeamEntry[]>([]);

  // Step 4: Goals
  const [goals, setGoals] = useState<GoalEntry[]>([]);

  const validStores = stores.filter((s) => s.name.trim().length > 0);

  const addStore = () => setStores([...stores, { name: "", city: "" }]);
  const removeStore = (i: number) => {
    if (stores.length <= 1) return;
    setStores(stores.filter((_, idx) => idx !== i));
  };
  const updateStore = (i: number, field: keyof StoreEntry, val: string) => {
    const copy = [...stores];
    copy[i] = { ...copy[i], [field]: val };
    setStores(copy);
  };

  const addTeamMember = () =>
    setTeam([...team, { name: "", email: "", password: "Mudar123!", role: "seller", store_name: validStores[0]?.name || "", manager_can_sell: false }]);
  const removeTeamMember = (i: number) => setTeam(team.filter((_, idx) => idx !== i));
  const updateTeamMember = (i: number, field: keyof TeamEntry, val: any) => {
    const copy = [...team];
    copy[i] = { ...copy[i], [field]: val };
    setTeam(copy);
  };

  // Init goals when entering step 4
  const initGoals = () => {
    const existingNames = goals.map((g) => g.store_name);
    const newGoals = [...goals];
    for (const s of validStores) {
      if (!existingNames.includes(s.name)) {
        newGoals.push({ store_name: s.name, target_value: 0 });
      }
    }
    setGoals(newGoals.filter((g) => validStores.some((s) => s.name === g.store_name)));
  };

  const canProceed = () => {
    if (step === 1) return validStores.length > 0;
    return true;
  };

  const goNext = () => {
    if (step === 3 - 1) initGoals(); // before goals step
    setStep(Math.min(step + 1, STEPS.length - 1));
  };
  const goBack = () => setStep(Math.max(step - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload logo first if present
      let logoUrl: string | undefined;
      if (logoFile && profile?.organization_id) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${profile.organization_id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("org-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadErr) throw new Error(`Erro ao enviar logo: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const payload: any = {
        stores: validStores,
        team: team.filter((t) => t.name.trim() && t.email.trim()),
        goals: goals.filter((g) => g.target_value > 0),
      };
      if (companyName.trim()) payload.company = { name: companyName.trim() };
      if (logoUrl) {
        payload.company = { ...(payload.company || {}), logo_url: logoUrl };
      }

      const res = await supabase.functions.invoke("setup-network", { body: payload });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const r = res.data?.results;
      const parts: string[] = [];
      if (r?.stores_created) parts.push(`${r.stores_created} loja(s)`);
      if (r?.users_created) parts.push(`${r.users_created} usuário(s)`);
      if (r?.goals_created) parts.push(`${r.goals_created} meta(s)`);
      if (r?.organization_updated) parts.push("empresa atualizada");

      toast.success(parts.length ? `Configuração concluída: ${parts.join(", ")}` : "Configuração concluída!");

      if (r?.errors?.length) {
        r.errors.forEach((e: string) => toast.warning(e));
      }

      navigate(getDashboardByRole(role));
    } catch (e: any) {
      toast.error(e.message || "Erro ao configurar rede");
    }
    setSubmitting(false);
  };

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-32">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Configuração da Rede</h1>
            <p className="text-sm text-muted-foreground">
              Configure lojas, equipe e metas em poucos passos.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/10 text-primary cursor-pointer"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <StepCompany
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                  logoFile={logoFile}
                  setLogoFile={setLogoFile}
                  logoPreview={logoPreview}
                  setLogoPreview={setLogoPreview}
                />
              )}
              {step === 1 && (
                <StepStores stores={stores} addStore={addStore} removeStore={removeStore} updateStore={updateStore} />
              )}
              {step === 2 && (
                <StepTeam
                  team={team}
                  storeNames={validStores.map((s) => s.name)}
                  addTeamMember={addTeamMember}
                  removeTeamMember={removeTeamMember}
                  updateTeamMember={updateTeamMember}
                />
              )}
              {step === 3 && <StepGoals goals={goals} setGoals={setGoals} />}
              {step === 4 && (
                <StepReview
                  companyName={companyName}
                  stores={validStores}
                  team={team.filter((t) => t.name.trim() && t.email.trim())}
                  goals={goals.filter((g) => g.target_value > 0)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={goBack} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={!canProceed()}>
                {step === 0 || step === 2 || step === 3 ? "Pular" : "Próximo"}{" "}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Configurando...
                  </>
                ) : (
                  "Concluir Configuração"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

/* ───── Step Components ───── */

function StepCompany({
  companyName,
  setCompanyName,
  logoFile,
  setLogoFile,
  logoPreview,
  setLogoPreview,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
  logoPreview: string | null;
  setLogoPreview: (v: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 2MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">Dados da Empresa</h2>
      <p className="text-sm text-muted-foreground">Atualize o nome e logo da sua rede.</p>
      <div className="space-y-2">
        <Label>Nome da empresa</Label>
        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Ótica VilaCar" />
      </div>
      <div className="space-y-2">
        <Label>Logo da empresa</Label>
        {logoPreview ? (
          <div className="flex items-center gap-3">
            <img src={logoPreview} alt="Preview" className="h-10 w-auto max-w-[120px] rounded-lg object-contain border border-border" />
            <Button variant="ghost" size="sm" onClick={clearLogo} className="text-destructive">
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 hover:border-primary/50 hover:bg-accent/30 transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Enviar logo (PNG, JPG, SVG — até 2MB)</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFileChange} />
      </div>
    </Card>
  );
}

function StepStores({
  stores,
  addStore,
  removeStore,
  updateStore,
}: {
  stores: StoreEntry[];
  addStore: () => void;
  removeStore: (i: number) => void;
  updateStore: (i: number, field: keyof StoreEntry, val: string) => void;
}) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">Lojas da Rede</h2>
      <p className="text-sm text-muted-foreground">Cadastre as lojas que fazem parte da sua rede.</p>

      <div className="space-y-3">
        {stores.map((s, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input
                value={s.name}
                onChange={(e) => updateStore(i, "name", e.target.value)}
                placeholder="Nome da loja"
              />
              <Input
                value={s.city}
                onChange={(e) => updateStore(i, "city", e.target.value)}
                placeholder="Cidade (opcional)"
              />
            </div>
            {stores.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeStore(i)} className="mt-1 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addStore} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Adicionar loja
      </Button>
    </Card>
  );
}

function StepTeam({
  team,
  storeNames,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
}: {
  team: TeamEntry[];
  storeNames: string[];
  addTeamMember: () => void;
  removeTeamMember: (i: number) => void;
  updateTeamMember: (i: number, field: keyof TeamEntry, val: any) => void;
}) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">Equipe Inicial</h2>
      <p className="text-sm text-muted-foreground">
        Cadastre gerentes e vendedores. A senha padrão é <strong>Mudar123!</strong> — cada um deve alterar no primeiro acesso.
      </p>

      {team.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum membro adicionado. Você pode pular esta etapa.
        </p>
      )}

      <div className="space-y-4">
        {team.map((m, i) => {
          const nameErr = m.name.trim() ? validateName(m.name) : "";
          return (
            <div key={i} className="border border-border rounded-xl p-3 space-y-2 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTeamMember(i)}
                className="absolute top-2 right-2 h-7 w-7 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nome completo</Label>
                  <Input
                    value={m.name}
                    onChange={(e) => updateTeamMember(i, "name", e.target.value)}
                    placeholder="Nome Sobrenome"
                  />
                  {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={m.email}
                    onChange={(e) => updateTeamMember(i, "email", e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Senha</Label>
                  <Input
                    value={m.password}
                    onChange={(e) => updateTeamMember(i, "password", e.target.value)}
                    placeholder="Mudar123!"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Perfil</Label>
                  <Select value={m.role} onValueChange={(v) => updateTeamMember(i, "role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Loja</Label>
                  <Select value={m.store_name} onValueChange={(v) => updateTeamMember(i, "store_name", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
                    <SelectContent>
                      {storeNames.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {m.role === "manager" && (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={m.manager_can_sell}
                    onCheckedChange={(v) => updateTeamMember(i, "manager_can_sell", v)}
                  />
                  <Label className="text-xs text-muted-foreground">Gerente também vende</Label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addTeamMember} className="w-full" disabled={storeNames.length === 0}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar membro
      </Button>
      {storeNames.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">Cadastre pelo menos uma loja antes de adicionar a equipe.</p>
      )}
    </Card>
  );
}

function StepGoals({ goals, setGoals }: { goals: GoalEntry[]; setGoals: (g: GoalEntry[]) => void }) {
  const updateGoal = (i: number, val: number) => {
    const copy = [...goals];
    copy[i] = { ...copy[i], target_value: val };
    setGoals(copy);
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">Metas Mensais</h2>
      <p className="text-sm text-muted-foreground">Defina a meta mensal de cada loja. Você pode pular e definir depois.</p>

      {goals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Cadastre lojas para definir metas.
        </p>
      )}

      <div className="space-y-3">
        {goals.map((g, i) => (
          <div key={g.store_name} className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{g.store_name}</Label>
              <Input
                type="number"
                value={g.target_value || ""}
                onChange={(e) => updateGoal(i, parseFloat(e.target.value) || 0)}
                placeholder="R$ 0,00"
                min={0}
              />
            </div>
            {g.target_value > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatBRL(g.target_value)}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StepReview({
  companyName,
  stores,
  team,
  goals,
}: {
  companyName: string;
  stores: StoreEntry[];
  team: TeamEntry[];
  goals: GoalEntry[];
}) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">Revisão</h2>
      <p className="text-sm text-muted-foreground">Confirme os dados antes de concluir.</p>

      {companyName && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Empresa</p>
          <p className="text-sm text-foreground">{companyName}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {stores.length} loja(s)
        </p>
        <ul className="text-sm text-foreground space-y-0.5 mt-1">
          {stores.map((s) => (
            <li key={s.name}>
              {s.name}
              {s.city && <span className="text-muted-foreground"> — {s.city}</span>}
            </li>
          ))}
        </ul>
      </div>

      {team.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {team.length} membro(s) da equipe
          </p>
          <ul className="text-sm text-foreground space-y-0.5 mt-1">
            {team.map((t) => (
              <li key={t.email}>
                {t.name} — {t.role === "manager" ? "Gerente" : "Vendedor"} — {t.store_name}
                {t.role === "manager" && t.manager_can_sell && " (vende)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Metas</p>
          <ul className="text-sm text-foreground space-y-0.5 mt-1">
            {goals.map((g) => (
              <li key={g.store_name}>
                {g.store_name}: {formatBRL(g.target_value)}/mês
              </li>
            ))}
          </ul>
        </div>
      )}

      {stores.length === 0 && team.length === 0 && goals.length === 0 && !companyName && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma configuração definida. Você pode voltar e preencher os dados.
        </p>
      )}
    </Card>
  );
}

export default NetworkSetup;
