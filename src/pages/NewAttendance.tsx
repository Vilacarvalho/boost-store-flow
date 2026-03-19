import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, X, Minus, Plus, User, Phone,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBRL, formatBRL } from "@/lib/currency";

/* ── helpers ─────────────────────────────────────── */

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const digitsOnly = (v: string) => v.replace(/\D/g, "");

/* ── constants ───────────────────────────────────── */

const productTypes = [
  { id: "solar", label: "Solar", emoji: "🕶️" },
  { id: "armacao", label: "Armação", emoji: "👓" },
  { id: "lente", label: "Lente", emoji: "🔍" },
];

const lossReasons = [
  "Modelo indisponível", "Preço", "Vai comparar",
  "Retorna depois", "Sem receita", "Outro",
];

/* ── component ───────────────────────────────────── */

const NewAttendance = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Customer (optional)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Attendance fields
  const [productType, setProductType] = useState("");
  const [result, setResult] = useState<"won" | "lost" | "">("");
  const [objectionReason, setObjectionReason] = useState("");
  const [objectionDescription, setObjectionDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [productsCount, setProductsCount] = useState(1);
  const [totalValue, setTotalValue] = useState("");

  // Smart prompt
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);

  /* ── phone autocomplete ──────────────────────── */

  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const digits = digitsOnly(phone);
    if (digits.length < 10 || !profile?.organization_id) return;

    const { data } = await supabase
      .from("customers")
      .select("id, name, whatsapp")
      .eq("organization_id", profile.organization_id)
      .eq("whatsapp", digits)
      .limit(1);

    if (data && data.length > 0) {
      setMatchedCustomerId(data[0].id);
      setCustomerName(data[0].name);
      setAutoFilled(true);
    } else {
      setMatchedCustomerId(null);
      if (autoFilled) { setCustomerName(""); setAutoFilled(false); }
    }
  }, [profile?.organization_id, autoFilled]);

  const handlePhoneChange = (raw: string) => {
    const formatted = formatPhone(raw);
    setCustomerPhone(formatted);
    setMatchedCustomerId(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCustomerByPhone(formatted), 400);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  /* ── validation ──────────────────────────────── */

  const canSubmit = () => {
    if (!productType || !result) return false;
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

  const hasValidPhone = () => digitsOnly(customerPhone).length >= 10;

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
        // Search again to avoid duplicates
        const normalizedPhone = digitsOnly(customerPhone);
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
              name: customerName.trim() || "Cliente " + normalizedPhone.slice(-4),
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

      navigate("/dashboard");
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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="mr-3 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-foreground flex-1">Novo Atendimento</h1>
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
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
                  onChange={(e) => { setCustomerName(e.target.value); if (autoFilled) setAutoFilled(false); }}
                  className="pl-9 rounded-xl bg-secondary/50 border-0"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="(00) 00000-0000"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  inputMode="tel"
                  className="pl-9 rounded-xl bg-secondary/50 border-0"
                />
              </div>
              {matchedCustomerId && (
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
