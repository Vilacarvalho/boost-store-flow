import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, X, Minus, Plus, User, Phone,
} from "lucide-react";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { DraftRecoveryBanner } from "@/components/DraftRecoveryBanner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardByRole } from "@/lib/roleRedirect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBRL, formatBRL } from "@/lib/currency";
import { formatPhoneBR, normalizePhone, validatePhoneOptional, normalizeName } from "@/lib/validation";

/* ── constants ───────────────────────────────────── */

const productTypes = [
  { id: "solar", label: "Solar", emoji: "🕶️" },
  { id: "armacao", label: "Armação", emoji: "👓" },
  { id: "lente", label: "Lente", emoji: "🔍" },
];

const saleCategories = [
  { id: "lentes", label: "Lentes", emoji: "🔍" },
  { id: "armacao", label: "Armação", emoji: "👓" },
  { id: "solar", label: "Solar", emoji: "🕶️" },
  { id: "outros", label: "Outros", emoji: "📦" },
];

const outrosSubcategories = [
  { id: "conserto", label: "Conserto" },
  { id: "acessorio", label: "Acessório" },
  { id: "limpeza", label: "Limpeza" },
  { id: "servico", label: "Serviço" },
];

const lossReasons = [
  "Modelo indisponível", "Preço", "Vai comparar",
  "Retorna depois", "Sem receita", "Outro",
];

/* ── component ───────────────────────────────────── */

interface AttendanceDraft {
  customerName: string;
  customerPhone: string;
  productType: string;
  saleCategory: string;
  saleSubcategory: string;
  result: "won" | "lost" | "";
  objectionReason: string;
  objectionDescription: string;
  notes: string;
  productsCount: number;
  totalValue: string;
}

const INITIAL_DRAFT: AttendanceDraft = {
  customerName: "",
  customerPhone: "",
  productType: "",
  saleCategory: "",
  saleSubcategory: "",
  result: "",
  objectionReason: "",
  objectionDescription: "",
  notes: "",
  productsCount: 1,
  totalValue: "",
};

const NewAttendance = () => {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const draft = useFormDraft<AttendanceDraft>({
    key: "new-attendance",
    initialValues: INITIAL_DRAFT,
    userId: user?.id,
  });

  // Derived state from draft
  const customerName = draft.values.customerName;
  const setCustomerName = (v: string) => draft.setValues(prev => ({ ...prev, customerName: v }));
  const customerPhone = draft.values.customerPhone;
  const setCustomerPhone = (v: string) => draft.setValues(prev => ({ ...prev, customerPhone: v }));
  const productType = draft.values.productType;
  const setProductType = (v: string) => draft.setValues(prev => ({ ...prev, productType: v }));
  const saleCategory = draft.values.saleCategory;
  const setSaleCategory = (v: string) => draft.setValues(prev => ({ ...prev, saleCategory: v, saleSubcategory: v !== "outros" ? "" : prev.saleSubcategory }));
  const saleSubcategory = draft.values.saleSubcategory;
  const setSaleSubcategory = (v: string) => draft.setValues(prev => ({ ...prev, saleSubcategory: v }));
  const result = draft.values.result;
  const setResult = (v: "won" | "lost" | "") => draft.setValues(prev => ({ ...prev, result: v }));
  const objectionReason = draft.values.objectionReason;
  const setObjectionReason = (v: string) => draft.setValues(prev => ({ ...prev, objectionReason: v }));
  const objectionDescription = draft.values.objectionDescription;
  const setObjectionDescription = (v: string) => draft.setValues(prev => ({ ...prev, objectionDescription: v }));
  const notes = draft.values.notes;
  const setNotes = (v: string) => draft.setValues(prev => ({ ...prev, notes: v }));
  const productsCount = draft.values.productsCount;
  const setProductsCount = (v: number) => draft.setValues(prev => ({ ...prev, productsCount: v }));
  const totalValue = draft.values.totalValue;
  const setTotalValue = (v: string) => draft.setValues(prev => ({ ...prev, totalValue: v }));

  // Customer matching state (not part of draft)
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [matchedCustomerInfo, setMatchedCustomerInfo] = useState<{
    name: string; whatsapp: string | null; store_name?: string; last_sale_date?: string;
  } | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Name-based suggestions
  const [nameSuggestions, setNameSuggestions] = useState<Array<{
    id: string; name: string; whatsapp: string | null;
  }>>([]);

  // Smart prompt
  const [phoneError, setPhoneError] = useState("");
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);

  /* ── phone autocomplete ──────────────────────── */

  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const digits = normalizePhone(phone);
    if (digits.length < 12 || !profile?.organization_id) return;

    const { data } = await supabase
      .from("customers")
      .select("id, name, whatsapp, store_id")
      .eq("organization_id", profile.organization_id)
      .eq("whatsapp", digits)
      .limit(1);

    if (data && data.length > 0) {
      const match = data[0];
      setMatchedCustomerId(match.id);
      setCustomerName(match.name);
      setAutoFilled(true);
      setNameSuggestions([]);

      // Fetch extra info: store name & last sale
      const [storeRes, saleRes] = await Promise.all([
        match.store_id
          ? supabase.from("stores").select("name").eq("id", match.store_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("sales").select("created_at").eq("customer_id", match.id)
          .order("created_at", { ascending: false }).limit(1),
      ]);

      setMatchedCustomerInfo({
        name: match.name,
        whatsapp: match.whatsapp,
        store_name: storeRes.data?.name ?? undefined,
        last_sale_date: saleRes.data?.[0]?.created_at ?? undefined,
      });
    } else {
      setMatchedCustomerId(null);
      setMatchedCustomerInfo(null);
      if (autoFilled) { setCustomerName(""); setAutoFilled(false); }
    }
  }, [profile?.organization_id, autoFilled]);

  const searchCustomerByName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 3 || !profile?.organization_id || matchedCustomerId) return;

    const { data } = await supabase
      .from("customers")
      .select("id, name, whatsapp")
      .eq("organization_id", profile.organization_id)
      .ilike("name", `%${trimmed}%`)
      .limit(5);

    setNameSuggestions(data || []);
  }, [profile?.organization_id, matchedCustomerId]);

  const handlePhoneChange = (raw: string) => {
    const formatted = formatPhoneBR(raw);
    setCustomerPhone(formatted);
    setMatchedCustomerId(null);
    setMatchedCustomerInfo(null);
    setPhoneError("");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCustomerByPhone(formatted), 400);
  };

  const handleNameChange = (value: string) => {
    setCustomerName(value);
    if (autoFilled) setAutoFilled(false);
    setNameSuggestions([]);
    clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(() => searchCustomerByName(value), 400);
  };

  const selectSuggestion = (s: { id: string; name: string; whatsapp: string | null }) => {
    setMatchedCustomerId(s.id);
    setCustomerName(s.name);
    if (s.whatsapp) setCustomerPhone(formatPhoneBR(s.whatsapp));
    setAutoFilled(true);
    setNameSuggestions([]);
  };

  const handlePhoneBlur = () => {
    const err = validatePhoneOptional(customerPhone);
    if (err) setPhoneError(err);
  };

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    clearTimeout(nameDebounceRef.current);
  }, []);

  /* ── validation ──────────────────────────────── */

  const canSubmit = () => {
    if (!productType || !result || !saleCategory) return false;
    if (result === "lost") {
      if (!objectionReason) return false;
      if (objectionReason === "Outro" && !objectionDescription.trim()) return false;
    }
    if (result === "won") {
      if (!totalValue || parseBRL(totalValue) <= 0) return false;
      if (productsCount < 1) return false;
    }
    return true;
  };

  const hasValidPhone = () => normalizePhone(customerPhone).length >= 12;

  /* ── submit ──────────────────────────────────── */

  const handleAttemptSubmit = () => {
    if (!canSubmit()) return;
    if (!matchedCustomerId && !hasValidPhone()) {
      // No phone = no customer. Show prompt only if user typed something partial
      if (customerName.trim() || customerPhone.trim()) {
        setShowCustomerPrompt(true);
      } else {
        doSubmit(null);
      }
    } else {
      doSubmit(matchedCustomerId);
    }
  };

  const doSubmit = async (existingCustomerId: string | null) => {
    if (!user || !profile?.organization_id || !profile?.store_id) {
      toast({ title: "Erro", description: "Perfil incompleto. Configure sua loja.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let customerId = existingCustomerId;

      // Auto-create customer ONLY if valid phone and no matched customer
      if (!customerId && hasValidPhone()) {
        const normalizedPhone = normalizePhone(customerPhone);
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("organization_id", profile.organization_id)
          .eq("whatsapp", normalizedPhone)
          .limit(1);

        if (existing && existing.length > 0) {
          customerId = existing[0].id;
        } else {
          const { data: newCustomer, error: custErr } = await supabase
            .from("customers")
            .insert({
              organization_id: profile.organization_id,
              store_id: profile.store_id,
              name: customerName.trim() ? normalizeName(customerName) : "Cliente " + normalizedPhone.slice(-4),
              whatsapp: normalizedPhone,
              status: "new",
            })
            .select("id")
            .single();
          if (custErr) throw custErr;
          customerId = newCustomer.id;
        }
      }

      const { error } = await supabase.from("sales").insert({
        organization_id: profile.organization_id,
        store_id: profile.store_id,
        seller_id: user.id,
        customer_id: customerId,
        status: result as "won" | "lost",
        product_type: productType,
        objection_reason: result === "lost" ? objectionReason : null,
        objection_description: result === "lost" && objectionReason === "Outro" ? objectionDescription : null,
        notes: notes || null,
        products_count: result === "won" ? productsCount : 0,
        total_value: result === "won" ? parseBRL(totalValue) : 0,
        products_shown_count: result === "won" ? productsCount : 0,
      });

      if (error) throw error;

      toast({
        title: result === "won" ? "🎉 Venda registrada!" : "Atendimento salvo",
        description: result === "won"
          ? `${formatBRL(parseBRL(totalValue))} registrados com sucesso.`
          : "Atendimento registrado.",
      });

      draft.clearDraft();
      navigate(getDashboardByRole(role));
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── render ──────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnsavedChangesGuard isDirty={draft.isDirty} />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="mr-3 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-foreground flex-1">Novo Atendimento</h1>
          <AutosaveIndicator isSaving={draft.isSaving} lastSaved={draft.lastSaved} isDirty={draft.isDirty} />
          <button onClick={() => navigate(getDashboardByRole(role))} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        {draft.wasRecovered && (
          <DraftRecoveryBanner
            onRestore={() => draft.dismissRecovery()}
            onDiscard={() => draft.discardDraft()}
          />
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* 0. Customer (optional) */}
          <FieldGroup label="Cliente (opcional)">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="pl-9 rounded-xl bg-secondary/50 border-0"
                />
              </div>

              {/* Name-based suggestions */}
              {nameSuggestions.length > 0 && !matchedCustomerId && (
                <div className="rounded-xl border border-border bg-card p-2 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                    Clientes semelhantes encontrados
                  </p>
                  {nameSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                        {s.whatsapp && (
                          <p className="text-[10px] text-muted-foreground">{formatPhoneBR(s.whatsapp)}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-primary font-medium shrink-0">Usar</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="(00) 00000-0000"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  inputMode="tel"
                  className="pl-9 rounded-xl bg-secondary/50 border-0"
                />
              </div>
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}

              {/* Rich duplicate match info */}
              {matchedCustomerId && matchedCustomerInfo && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1">
                  <p className="text-xs font-medium text-primary">✓ Cliente encontrado no CRM</p>
                  <p className="text-xs text-foreground font-medium">{matchedCustomerInfo.name}</p>
                  {matchedCustomerInfo.whatsapp && (
                    <p className="text-[10px] text-muted-foreground">Tel: {formatPhoneBR(matchedCustomerInfo.whatsapp)}</p>
                  )}
                  {matchedCustomerInfo.store_name && (
                    <p className="text-[10px] text-muted-foreground">Loja: {matchedCustomerInfo.store_name}</p>
                  )}
                  {matchedCustomerInfo.last_sale_date && (
                    <p className="text-[10px] text-muted-foreground">
                      Último atendimento: {new Date(matchedCustomerInfo.last_sale_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedCustomerId(null);
                      setMatchedCustomerInfo(null);
                      setCustomerName("");
                      setCustomerPhone("");
                      setAutoFilled(false);
                    }}
                    className="text-[10px] text-muted-foreground underline mt-1"
                  >
                    Limpar e cadastrar novo
                  </button>
                </div>
              )}
              {matchedCustomerId && !matchedCustomerInfo && (
                <p className="text-xs text-primary font-medium">✓ Cliente encontrado no CRM</p>
              )}
            </div>
          </FieldGroup>

          {/* 1. Product Type */}
          <FieldGroup label="Tipo de Produto *">
            <div className="grid grid-cols-3 gap-2">
              {productTypes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProductType(p.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    productType === p.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* 2. Result */}
          <FieldGroup label="Resultado *">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setResult("won"); setObjectionReason(""); setObjectionDescription(""); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  result === "won" ? "border-success bg-success/5" : "border-transparent bg-secondary/50"
                }`}
              >
                <span className="text-2xl">🎉</span>
                <p className="text-sm font-medium text-foreground mt-1">Comprou</p>
              </button>
              <button
                onClick={() => setResult("lost")}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  result === "lost" ? "border-destructive bg-destructive/5" : "border-transparent bg-secondary/50"
                }`}
              >
                <span className="text-2xl">😔</span>
                <p className="text-sm font-medium text-foreground mt-1">Não comprou</p>
              </button>
            </div>
          </FieldGroup>

          {/* 3. Loss Reason */}
          {result === "lost" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
              <FieldGroup label="Motivo *">
                <div className="grid grid-cols-2 gap-2">
                  {lossReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => { setObjectionReason(reason); if (reason !== "Outro") setObjectionDescription(""); }}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        objectionReason === reason
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-secondary/50"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{reason}</p>
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {objectionReason === "Outro" && (
                <FieldGroup label="Descreva o motivo *">
                  <Textarea
                    placeholder="Descreva o motivo..."
                    value={objectionDescription}
                    onChange={(e) => setObjectionDescription(e.target.value)}
                    className="rounded-xl bg-secondary/50 border-0 resize-none"
                    rows={2}
                  />
                </FieldGroup>
              )}
            </motion.div>
          )}

          {/* 4. Notes */}
          <FieldGroup label="Observações">
            <Textarea
              placeholder="Anotações sobre o atendimento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl bg-secondary/50 border-0 resize-none"
              rows={2}
            />
          </FieldGroup>

          {/* 5. Products Count */}
          {result === "won" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FieldGroup label="P.A. (Produtos por Atendimento) *">
                <div className="flex items-center justify-center gap-6">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setProductsCount(Math.max(1, productsCount - 1))}
                    className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground"
                  >
                    <Minus className="h-5 w-5" />
                  </motion.button>
                  <motion.span
                    key={productsCount}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-semibold text-foreground tabular-nums w-16 text-center"
                  >
                    {productsCount}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setProductsCount(productsCount + 1)}
                    className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground"
                  >
                    <Plus className="h-5 w-5" />
                  </motion.button>
                </div>
              </FieldGroup>
            </motion.div>
          )}

          {/* 6. Total Value */}
          {result === "won" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FieldGroup label="Faturamento *">
                <CurrencyInput
                  value={totalValue}
                  onValueChange={setTotalValue}
                  placeholder="Ex: 1.500,00"
                  className="h-12 rounded-xl bg-secondary/50 border-0 text-lg font-semibold"
                />
              </FieldGroup>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom Action */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            className="w-full rounded-xl font-semibold"
            onClick={handleAttemptSubmit}
            disabled={!canSubmit() || saving}
          >
            {saving ? "Salvando..." : result === "won" ? "🎉 Registrar Venda" : "Finalizar Atendimento"}
            {!saving && <Check className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>

      {/* Smart prompt dialog */}
      <AlertDialog open={showCustomerPrompt} onOpenChange={setShowCustomerPrompt}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Salvar cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Quer salvar esse cliente para retorno ou acompanhamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => { setShowCustomerPrompt(false); /* keep form open for user to fill */ }}
              className="rounded-xl"
            >
              Salvar cliente
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => { setShowCustomerPrompt(false); doSubmit(null); }}
              className="rounded-xl"
            >
              Continuar sem cliente
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
    {children}
  </div>
);

export default NewAttendance;
