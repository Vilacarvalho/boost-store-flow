import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, getDashboardByRole } from "@/lib/roleRedirect";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Target, BarChart3, BookOpen, FileText, Heart,
  Store, Users, Calculator, ShoppingBag, Rocket, ClipboardCheck,
} from "lucide-react";

interface StepCard {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  roles: AppRole[];
}

const allSteps: StepCard[] = [
  { icon: BarChart3, title: "Painel da Rede", description: "Acompanhe os resultados consolidados da rede.", path: "/admin-dashboard", roles: ["admin", "super_admin"] },
  { icon: Store, title: "Gestão de Lojas", description: "Cadastre e gerencie as lojas da rede.", path: "/stores", roles: ["admin", "super_admin"] },
  { icon: Users, title: "Gestão de Usuários", description: "Adicione vendedores e gerentes e vincule às lojas.", path: "/users", roles: ["admin", "super_admin"] },
  { icon: Target, title: "Metas", description: "Acompanhe metas da rede e da operação.", path: "/goals", roles: ["admin", "manager", "super_admin"] },
  { icon: Calculator, title: "Planejador de Metas", description: "Crie planos de metas com base em histórico e crescimento desejado.", path: "/goal-planner", roles: ["admin", "super_admin"] },
  { icon: ClipboardCheck, title: "Painel de Supervisão", description: "Gerencie visitas, diagnósticos e acompanhamento de lojas.", path: "/supervisor-dashboard", roles: ["supervisor"] },
  { icon: BarChart3, title: "Painel da Loja", description: "Veja indicadores consolidados da sua loja.", path: "/manager-dashboard", roles: ["manager"] },
  { icon: BarChart3, title: "Meu Painel", description: "Acompanhe sua performance comercial diária.", path: "/dashboard", roles: ["seller"] },
  { icon: Plus, title: "Registrar Atendimento", description: "Registre atendimentos com tipo de produto, resultado e faturamento.", path: "/new-attendance", roles: ["manager", "seller"] },
  { icon: ShoppingBag, title: "Vendas do Dia", description: "Acompanhe os atendimentos registrados pela operação.", path: "/sales", roles: ["manager", "seller"] },
  { icon: BookOpen, title: "Central de Conteúdo", description: "Acesse campanhas, comunicados e materiais de apoio.", path: "/content-center", roles: ["admin", "manager", "seller", "super_admin"] },
  { icon: FileText, title: "Manual Operacional", description: "Consulte processos e procedimentos internos.", path: "/manual", roles: ["admin", "manager", "seller", "super_admin"] },
  { icon: Heart, title: "Cultura", description: "Conheça a missão, visão e valores da empresa.", path: "/culture", roles: ["admin", "manager", "seller", "super_admin"] },
];

const roleGreetings: Record<AppRole, string> = {
  super_admin: "Você tem acesso global ao ambiente administrativo.",
  admin: "Acompanhe a rede e gerencie lojas, pessoas e metas.",
  supervisor: "Acompanhe visitas, diagnósticos e evolução das lojas.",
  manager: "Gerencie a performance da loja e acompanhe a operação.",
  seller: "Registre atendimentos, acompanhe suas metas e acesse materiais de apoio.",
};

const Onboarding = () => {
  const { role, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading || !role) {
    return (
      <AppLayout showFab={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const steps = allSteps.filter((step) => step.roles.includes(role));

  return (
    <AppLayout showFab={false}>
      <div className="p-4 md:pl-72 md:p-8 max-w-4xl mx-auto space-y-8 pb-32">
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-2">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Bem-vindo{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {roleGreetings[role]}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <Card
              key={step.path}
              className="p-4 flex items-start gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(step.path)}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center pt-2">
          <Button size="lg" onClick={() => navigate(getDashboardByRole(role))}>
            Começar
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Onboarding;
