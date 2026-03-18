import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  Tag,
  Sparkles,
  Rocket,
  Award,
  Minus,
  Plus,
  MessageCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["Diagnóstico", "Apresentação", "Fechamento", "Objeções"];

const drivers = [
  { id: "price", label: "Preço", icon: Tag, emoji: "🏷️" },
  { id: "quality", label: "Qualidade", icon: Award, emoji: "⭐" },
  { id: "style", label: "Estilo", icon: Sparkles, emoji: "✨" },
  { id: "urgency", label: "Urgência", icon: Rocket, emoji: "🚀" },
];

const objectionReasons = [
  { id: "price", label: "Preço" },
  { id: "indecision", label: "Indecisão" },
  { id: "thinking", label: "Vai pensar" },
  { id: "comparison", label: "Comparação" },
  { id: "other", label: "Outro" },
];

const objectionSuggestions: Record<string, string> = {
  price: "Foque no parcelamento ou no valor por dia de uso (Custo-Benefício). Destaque a economia a longo prazo.",
  indecision: "Reforce os benefícios principais e crie senso de oportunidade. Pergunte: 'O que falta para fecharmos?'",
  thinking: "Agende um follow-up: 'Posso te enviar mais informações por WhatsApp? Quando posso te retornar?'",
  comparison: "Destaque os diferenciais exclusivos. Pergunte o que é mais importante e mostre superioridade nesses pontos.",
  other: "Investigue mais a fundo o motivo real. Muitas vezes a objeção inicial não é a verdadeira.",
};

const closingTypes = [
  { id: "direct", label: "Direto", desc: "Propôs o fechamento diretamente" },
  { id: "alternative", label: "Alternativa", desc: "Ofereceu opções para escolher" },
  { id: "urgency", label: "Urgência", desc: "Usou gatilho de escassez/tempo" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
};

const NewAttendance = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1: Diagnosis
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [diagChecklist, setDiagChecklist] = useState({ need: false, budget: false });

  // Step 2: Presentation
  const [itemsShown, setItemsShown] = useState(0);
  const [presChecklist, setPresChecklist] = useState({
    showedThree: false,
    explainedBenefits: false,
    directedChoice: false,
  });

  // Step 3: Closing
  const [closingChecklist, setClosingChecklist] = useState({ triedClose: false });
  const [closingType, setClosingType] = useState("");
  const [saleResult, setSaleResult] = useState<"won" | "lost" | "">("");

  // Step 4: Objections
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
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    // Save attendance (mock)
    navigate("/dashboard");
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return customerName && customerWhatsapp && selectedDriver;
      case 1:
        return itemsShown > 0;
      case 2:
        return saleResult !== "";
      case 3:
        return objectionReason !== "";
      default:
        return true;
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
          <h1 className="text-sm font-semibold text-foreground flex-1">
            Novo Atendimento
          </h1>
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="flex gap-1 px-4 pb-3 max-w-lg mx-auto">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Step Content */}
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
            {/* Step Label */}
            <div>
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Etapa {step + 1} de {STEPS.length}
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mt-1">
                {STEPS[step]}
              </h2>
            </div>

            {step === 0 && (
              <StepDiagnosis
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerWhatsapp={customerWhatsapp}
                setCustomerWhatsapp={setCustomerWhatsapp}
                selectedDriver={selectedDriver}
                setSelectedDriver={setSelectedDriver}
                checklist={diagChecklist}
                setChecklist={setDiagChecklist}
              />
            )}

            {step === 1 && (
              <StepPresentation
                itemsShown={itemsShown}
                setItemsShown={setItemsShown}
                checklist={presChecklist}
                setChecklist={setPresChecklist}
              />
            )}

            {step === 2 && (
              <StepClosing
                checklist={closingChecklist}
                setChecklist={setClosingChecklist}
                closingType={closingType}
                setClosingType={setClosingType}
                saleResult={saleResult}
                setSaleResult={setSaleResult}
              />
            )}

            {step === 3 && (
              <StepObjections
                objectionReason={objectionReason}
                setObjectionReason={setObjectionReason}
              />
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
            <Button
              size="lg"
              className="flex-1 rounded-xl font-semibold"
              onClick={handleFinish}
              disabled={!canProceed()}
            >
              Finalizar Atendimento
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : step === 2 && saleResult === "won" ? (
            <Button
              variant="success"
              size="lg"
              className="flex-1 rounded-xl font-semibold"
              onClick={handleFinish}
            >
              🎉 Registrar Venda
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1 rounded-xl font-semibold"
              onClick={goNext}
              disabled={!canProceed()}
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Step Components
const StepDiagnosis = ({
  customerName, setCustomerName,
  customerWhatsapp, setCustomerWhatsapp,
  selectedDriver, setSelectedDriver,
  checklist, setChecklist,
}: {
  customerName: string; setCustomerName: (v: string) => void;
  customerWhatsapp: string; setCustomerWhatsapp: (v: string) => void;
  selectedDriver: string; setSelectedDriver: (v: string) => void;
  checklist: { need: boolean; budget: boolean };
  setChecklist: (v: { need: boolean; budget: boolean }) => void;
}) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Nome do Cliente
      </Label>
      <Input
        placeholder="Ex: João Silva"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        className="h-12 rounded-xl bg-secondary/50 border-0"
      />
    </div>

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        WhatsApp
      </Label>
      <Input
        placeholder="Ex: 11 99999-9999"
        inputMode="tel"
        value={customerWhatsapp}
        onChange={(e) => setCustomerWhatsapp(e.target.value)}
        className="h-12 rounded-xl bg-secondary/50 border-0"
      />
    </div>

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Driver de Compra
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {drivers.map((driver) => (
          <button
            key={driver.id}
            onClick={() => setSelectedDriver(driver.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              selectedDriver === driver.id
                ? "border-primary bg-primary/5"
                : "border-transparent bg-secondary/50 hover:bg-secondary"
            }`}
          >
            <span className="text-lg">{driver.emoji}</span>
            <span className="text-sm font-medium text-foreground">{driver.label}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Checklist
      </Label>
      <div className="space-y-2">
        <CheckItem
          label="Perguntou a necessidade"
          checked={checklist.need}
          onChange={() => setChecklist({ ...checklist, need: !checklist.need })}
        />
        <CheckItem
          label="Entendeu o orçamento"
          checked={checklist.budget}
          onChange={() => setChecklist({ ...checklist, budget: !checklist.budget })}
        />
      </div>
    </div>
  </div>
);

const StepPresentation = ({
  itemsShown, setItemsShown,
  checklist, setChecklist,
}: {
  itemsShown: number; setItemsShown: (v: number) => void;
  checklist: { showedThree: boolean; explainedBenefits: boolean; directedChoice: boolean };
  setChecklist: (v: { showedThree: boolean; explainedBenefits: boolean; directedChoice: boolean }) => void;
}) => (
  <div className="space-y-5">
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Produtos Apresentados
      </Label>
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setItemsShown(Math.max(0, itemsShown - 1))}
          className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground"
        >
          <Minus className="h-5 w-5" />
        </motion.button>
        <motion.span
          key={itemsShown}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-semibold text-foreground tabular-nums w-16 text-center"
        >
          {itemsShown}
        </motion.span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setItemsShown(itemsShown + 1)}
          className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground"
        >
          <Plus className="h-5 w-5" />
        </motion.button>
      </div>
    </div>

    {/* Alert when > 3 items */}
    <AnimatePresence>
      {itemsShown > 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-warning/10 border-l-4 border-warning p-4 rounded-r-xl"
        >
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Cuidado com excesso de opções
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Oferecer mais de 3 opções confunde o cliente e reduz a conversão em 22%.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Checklist
      </Label>
      <div className="space-y-2">
        <CheckItem
          label="Mostrou até 3 produtos"
          checked={checklist.showedThree}
          onChange={() => setChecklist({ ...checklist, showedThree: !checklist.showedThree })}
        />
        <CheckItem
          label="Explicou benefícios"
          checked={checklist.explainedBenefits}
          onChange={() => setChecklist({ ...checklist, explainedBenefits: !checklist.explainedBenefits })}
        />
        <CheckItem
          label="Direcionou escolha"
          checked={checklist.directedChoice}
          onChange={() => setChecklist({ ...checklist, directedChoice: !checklist.directedChoice })}
        />
      </div>
    </div>
  </div>
);

const StepClosing = ({
  checklist, setChecklist,
  closingType, setClosingType,
  saleResult, setSaleResult,
}: {
  checklist: { triedClose: boolean };
  setChecklist: (v: { triedClose: boolean }) => void;
  closingType: string; setClosingType: (v: string) => void;
  saleResult: "won" | "lost" | "";
  setSaleResult: (v: "won" | "lost" | "") => void;
}) => (
  <div className="space-y-5">
    <CheckItem
      label="Tentou fechar a venda"
      checked={checklist.triedClose}
      onChange={() => setChecklist({ triedClose: !checklist.triedClose })}
    />

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Tipo de Fechamento
      </Label>
      <div className="space-y-2">
        {closingTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setClosingType(type.id)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              closingType === type.id
                ? "border-primary bg-primary/5"
                : "border-transparent bg-secondary/50"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{type.label}</p>
            <p className="text-xs text-muted-foreground">{type.desc}</p>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Resultado
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSaleResult("won")}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            saleResult === "won"
              ? "border-success bg-success/5"
              : "border-transparent bg-secondary/50"
          }`}
        >
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-medium text-foreground mt-1">Vendeu!</p>
        </button>
        <button
          onClick={() => setSaleResult("lost")}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            saleResult === "lost"
              ? "border-destructive bg-destructive/5"
              : "border-transparent bg-secondary/50"
          }`}
        >
          <span className="text-2xl">😔</span>
          <p className="text-sm font-medium text-foreground mt-1">Não comprou</p>
        </button>
      </div>
    </div>
  </div>
);

const StepObjections = ({
  objectionReason,
  setObjectionReason,
}: {
  objectionReason: string;
  setObjectionReason: (v: string) => void;
}) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Motivo da Objeção
      </Label>
      <div className="space-y-2">
        {objectionReasons.map((reason) => (
          <button
            key={reason.id}
            onClick={() => setObjectionReason(reason.id)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              objectionReason === reason.id
                ? "border-primary bg-primary/5"
                : "border-transparent bg-secondary/50"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{reason.label}</p>
          </button>
        ))}
      </div>
    </div>

    {/* Suggestion Card */}
    <AnimatePresence>
      {objectionReason && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              Sugestão
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {objectionSuggestions[objectionReason]}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const CheckItem = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
      checked ? "bg-success/5" : "bg-secondary/50"
    }`}
  >
    <div
      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
        checked
          ? "bg-success border-success"
          : "border-muted-foreground/30"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-success-foreground" />}
    </div>
    <span className="text-sm text-foreground">{label}</span>
  </button>
);

export default NewAttendance;
