import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Shield, Scale, Zap } from "lucide-react";

export type PlanningMode = "conservative" | "balanced" | "aggressive";

interface Props {
  value: PlanningMode;
  onChange: (v: PlanningMode) => void;
}

const modes = [
  {
    value: "conservative" as const,
    label: "Conservador",
    desc: "Apenas inflação",
    icon: Shield,
    formula: "receita × (1 + inflação)",
  },
  {
    value: "balanced" as const,
    label: "Equilibrado",
    desc: "Inflação + mercado",
    icon: Scale,
    formula: "receita × (1 + inflação) × (1 + mercado)",
  },
  {
    value: "aggressive" as const,
    label: "Agressivo",
    desc: "Inflação + mercado + crescimento",
    icon: Zap,
    formula: "receita × (1 + inflação) × (1 + mercado) × (1 + desejado)",
  },
];

const PlanningModeSelector = ({ value, onChange }: Props) => (
  <div className="space-y-2">
    <Label>Modo de Planejamento</Label>
    <RadioGroup value={value} onValueChange={(v) => onChange(v as PlanningMode)} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {modes.map((m) => {
        const Icon = m.icon;
        const selected = value === m.value;
        return (
          <label
            key={m.value}
            className={`relative flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-colors ${
              selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value={m.value} id={m.value} />
              <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium text-foreground">{m.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
            <code className="text-[10px] text-muted-foreground/70 font-mono">{m.formula}</code>
          </label>
        );
      })}
    </RadioGroup>
  </div>
);

export default PlanningModeSelector;
