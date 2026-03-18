import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, AlertTriangle, Tag,
  Sparkles, Rocket, Award, Minus, Plus, MessageCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["Diagnóstico", "Apresentação", "Fechamento", "Objeções"];

const drivers = [
  { id: "price" as const, label: "Preço", emoji: "🏷️" },
  { id: "quality" as const, label: "Qualidade", emoji: "⭐" },
  { id: "style" as const, label: "Estilo", emoji: "✨" },
  { id: "urgency" as const, label: "Urgência", emoji: "🚀" },
];

const objectionReasons = [
  { id: "Preço", label: "Preço" },
  { id: "Indecisão", label: "Indecisão" },
  { id: "Vai pensar", label: "Vai pensar" },
  { id: "Comparação", label: "Comparação" },
  { id: "Outro", label: "Outro" },
];

const objectionSuggestions: Record<string, string> = {
  "Preço": "Foque no parcelamento ou no valor por dia de uso (Custo-Benefício). Destaque a economia a longo prazo.",
  "Indecisão": "Reforce os benefícios principais e crie senso de oportunidade. Pergunte: 'O que falta para fecharmos?'",
  "Vai pensar": "Agende um follow-up: 'Posso te enviar mais informações por WhatsApp? Quando posso te retornar?'",
  "Comparação": "Destaque os diferenciais exclusivos. Pergunte o que é mais importante e mostre superioridade nesses pontos.",
  "Outro": "Investigue mais a fundo o motivo real. Muitas vezes a objeção inicial não é a verdadeira.",
};

const closingTypes = [
  { id: "direct", label: "Direto", desc: "Propôs o fechamento diretamente" },
  { id: "alternative", label: "Alternativa", desc: "Ofereceu opções para escolher" },
  { id: "urgency", label: "Urgência", desc: "Usou gatilho de escassez/tempo" },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
};

const NewAttendance = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<"price" | "quality" | "style" | "urgency" | "">("");
  const [diagChecklist, setDiagChecklist] = useState({ need: false, budget: false });

  // Step 2
  const [itemsShown, setItemsShown] = useState(0);
  const [presChecklist, setPresChecklist] = useState({ showedThree: false, explainedBenefits: false, directedChoice: false });

  // Step 3
  const [closingChecklist, setClosingChecklist] = useState({ triedClose: false });
  const [closingType, setClosingType] = useState("");
  const [saleResult, setSaleResult] = useState<"won" | "lost" | "">("");
  const [totalValue, setTotalValue] = useState("");

  // Step 4
  const [objectionReason, setObjectionReason] = useState("");

  const goNext = () => {
    if (step === 2 && saleResult === "won") {
      handleFinish();
      return;
    }
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) { setDirection(-1); setStep(step - 1); }
  };

  const handleFinish = async () => {
    if (!user || !profile?.organization_id || !profile?.store_id) {
      toast({ title: "Erro", description: "Perfil incompleto. Configure sua loja.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Create or find customer
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          organization_id: profile.organization_id,
          store_id: profile.store_id,
          name: customerName,
          whatsapp: customerWhatsapp || null,
          profile_type: selectedDriver || null,
          status: saleResult === "won" ? "won" : "lost",
        })
        .select("id")
        .single();

      if (custErr) throw custErr;

      // 2. Create sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          organization_id: profile.organization_id,
          store_id: profile.store_id,
          seller_id: user.id,
          customer_id: customer.id,
          status: saleResult as "won" | "lost",
          driver: selectedDriver || null,
          products_shown_count: itemsShown,
          closing_type: closingType || null,
          objection_reason: saleResult === "lost" ? objectionReason || null : null,
          total_value: saleResult === "won" ? parseFloat(totalValue) || 0 : 0,
        })
        .select("id")
        .single();

      if (saleErr) throw saleErr;

      // 3. Create sale steps
      const { error: stepsErr } = await supabase
        .from("sale_steps")
        .insert({
          sale_id: sale.id,
          diagnostic_done: diagChecklist.need,
          budget_identified: diagChecklist.budget,
          presented_benefits: presChecklist.explainedBenefits,
          directed_choice: presChecklist.directedChoice,
          closing_attempted: closingChecklist.triedClose,
          objection_handled: saleResult === "lost" && !!objectionReason,
        });

      if (stepsErr) throw stepsErr;

      // 4. Create followup if lost
      if (saleResult === "lost" && customerWhatsapp) {
        await supabase.from("followups").insert({
          organization_id: profile.organization_id,
          store_id: profile.store_id,
          customer_id: customer.id,
          seller_id: user.id,
          status: "pending",
          due_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
          notes: `Objeção: ${objectionReason}`,
        });
      }

      toast({
        title: saleResult === "won" ? "🎉 Venda registrada!" : "Atendimento salvo",
        description: saleResult === "won"
          ? `R$ ${parseFloat(totalValue || "0").toLocaleString("pt-BR")} registrados com sucesso.`
          : "Follow-up agendado automaticamente.",
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return customerName && selectedDriver;
      case 1: return itemsShown > 0;
      case 2: return saleResult !== "" && (saleResult === "lost" || totalValue);
      case 3: return objectionReason !== "";
      default: return true;
    }
  };

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
        <div className="flex gap-1 px-4 pb-3 max-w-lg mx-auto">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-6"
          >
            <div>
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Etapa {step + 1} de {STEPS.length}
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mt-1">
                {STEPS[step]}
              </h2>
            </div>

            {step === 0 && (
              <div className="space-y-5">
                <FieldGroup label="Nome do Cliente">
                  <Input placeholder="Ex: João Silva" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0" />
                </FieldGroup>
                <FieldGroup label="WhatsApp">
                  <Input placeholder="Ex: 11 99999-9999" inputMode="tel" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0" />
                </FieldGroup>
                <FieldGroup label="Driver de Compra">
                  <div className="grid grid-cols-2 gap-2">
                    {drivers.map((d) => (
                      <button key={d.id} onClick={() => setSelectedDriver(d.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedDriver === d.id ? "border-primary bg-primary/5" : "border-transparent bg-secondary/50 hover:bg-secondary"}`}>
                        <span className="text-lg">{d.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </FieldGroup>
                <FieldGroup label="Checklist">
                  <div className="space-y-2">
                    <CheckItem label="Perguntou a necessidade" checked={diagChecklist.need} onChange={() => setDiagChecklist({ ...diagChecklist, need: !diagChecklist.need })} />
                    <CheckItem label="Entendeu o orçamento" checked={diagChecklist.budget} onChange={() => setDiagChecklist({ ...diagChecklist, budget: !diagChecklist.budget })} />
                  </div>
                </FieldGroup>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <FieldGroup label="Produtos Apresentados">
                  <div className="flex items-center justify-center gap-6">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setItemsShown(Math.max(0, itemsShown - 1))} className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                      <Minus className="h-5 w-5" />
                    </motion.button>
                    <motion.span key={itemsShown} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-semibold text-foreground tabular-nums w-16 text-center">
                      {itemsShown}
                    </motion.span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setItemsShown(itemsShown + 1)} className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                      <Plus className="h-5 w-5" />
                    </motion.button>
                  </div>
                </FieldGroup>
                <AnimatePresence>
                  {itemsShown > 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-warning/10 border-l-4 border-warning p-4 rounded-r-xl">
                      <div className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Cuidado com excesso de opções</p>
                          <p className="text-xs text-muted-foreground mt-1">Oferecer mais de 3 opções confunde o cliente e reduz a conversão em 22%.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <FieldGroup label="Checklist">
                  <div className="space-y-2">
                    <CheckItem label="Mostrou até 3 produtos" checked={presChecklist.showedThree} onChange={() => setPresChecklist({ ...presChecklist, showedThree: !presChecklist.showedThree })} />
                    <CheckItem label="Explicou benefícios" checked={presChecklist.explainedBenefits} onChange={() => setPresChecklist({ ...presChecklist, explainedBenefits: !presChecklist.explainedBenefits })} />
                    <CheckItem label="Direcionou escolha" checked={presChecklist.directedChoice} onChange={() => setPresChecklist({ ...presChecklist, directedChoice: !presChecklist.directedChoice })} />
                  </div>
                </FieldGroup>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <CheckItem label="Tentou fechar a venda" checked={closingChecklist.triedClose} onChange={() => setClosingChecklist({ triedClose: !closingChecklist.triedClose })} />
                <FieldGroup label="Tipo de Fechamento">
                  <div className="space-y-2">
                    {closingTypes.map((type) => (
                      <button key={type.id} onClick={() => setClosingType(type.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${closingType === type.id ? "border-primary bg-primary/5" : "border-transparent bg-secondary/50"}`}>
                        <p className="text-sm font-medium text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </FieldGroup>
                <FieldGroup label="Resultado">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSaleResult("won")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${saleResult === "won" ? "border-success bg-success/5" : "border-transparent bg-secondary/50"}`}>
                      <span className="text-2xl">🎉</span>
                      <p className="text-sm font-medium text-foreground mt-1">Vendeu!</p>
                    </button>
                    <button onClick={() => setSaleResult("lost")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${saleResult === "lost" ? "border-destructive bg-destructive/5" : "border-transparent bg-secondary/50"}`}>
                      <span className="text-2xl">😔</span>
                      <p className="text-sm font-medium text-foreground mt-1">Não comprou</p>
                    </button>
                  </div>
                </FieldGroup>
                {saleResult === "won" && (
                  <FieldGroup label="Valor da Venda">
                    <Input
                      placeholder="Ex: 1500.00"
                      inputMode="decimal"
                      value={totalValue}
                      onChange={(e) => setTotalValue(e.target.value)}
                      className="h-12 rounded-xl bg-secondary/50 border-0 text-lg font-semibold"
                    />
                  </FieldGroup>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <FieldGroup label="Motivo da Objeção">
                  <div className="space-y-2">
                    {objectionReasons.map((reason) => (
                      <button key={reason.id} onClick={() => setObjectionReason(reason.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${objectionReason === reason.id ? "border-primary bg-primary/5" : "border-transparent bg-secondary/50"}`}>
                        <p className="text-sm font-medium text-foreground">{reason.label}</p>
                      </button>
                    ))}
                  </div>
                </FieldGroup>
                <AnimatePresence>
                  {objectionReason && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">Sugestão</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {objectionSuggestions[objectionReason]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={goBack} className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {step === 3 ? (
            <Button size="lg" className="flex-1 rounded-xl font-semibold" onClick={handleFinish} disabled={!canProceed() || saving}>
              {saving ? "Salvando..." : "Finalizar Atendimento"}
              {!saving && <Check className="h-4 w-4 ml-1" />}
            </Button>
          ) : step === 2 && saleResult === "won" ? (
            <Button variant="success" size="lg" className="flex-1 rounded-xl font-semibold" onClick={handleFinish} disabled={!canProceed() || saving}>
              {saving ? "Salvando..." : "🎉 Registrar Venda"}
              {!saving && <Check className="h-4 w-4 ml-1" />}
            </Button>
          ) : (
            <Button size="lg" className="flex-1 rounded-xl font-semibold" onClick={goNext} disabled={!canProceed()}>
              Continuar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
    {children}
  </div>
);

const CheckItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${checked ? "bg-success/5" : "bg-secondary/50"}`}>
    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? "bg-success border-success" : "border-muted-foreground/30"}`}>
      {checked && <Check className="h-3 w-3 text-success-foreground" />}
    </div>
    <span className="text-sm text-foreground">{label}</span>
  </button>
);

export default NewAttendance;
