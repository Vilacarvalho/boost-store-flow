import { ReactNode, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OrgLogo from "./OrgLogo";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";
import {
  Home,
  Users,
  ShoppingBag,
  User,
  Plus,
  Store,
  Target,
  
  BarChart3,
  PieChart,
  BookOpen,
  FileText,
  Heart,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, canSell, getDashboardByRole } from "@/lib/roleRedirect";

type NavItem = {
  path: string;
  icon: typeof Home;
  label: string;
};

const roleNavigation: Record<AppRole, { primary: NavItem[]; secondary: NavItem[] }> = {
  super_admin: {
    primary: [
      { path: "/admin-dashboard", icon: Home, label: "Home" },
      { path: "/stores", icon: Store, label: "Lojas" },
      { path: "/users", icon: Users, label: "Usuários" },
      { path: "/profile", icon: User, label: "Perfil" },
    ],
    secondary: [
      { path: "/goals", icon: Target, label: "Metas" },
      { path: "/goal-performance", icon: BarChart3, label: "Performance" },
      { path: "/conversion-analysis", icon: PieChart, label: "Conversão" },
      { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
      { path: "/manual", icon: FileText, label: "Manual" },
      { path: "/culture", icon: Heart, label: "Cultura" },
    ],
  },
  admin: {
    primary: [
      { path: "/admin-dashboard", icon: Home, label: "Home" },
      { path: "/stores", icon: Store, label: "Lojas" },
      { path: "/users", icon: Users, label: "Usuários" },
      { path: "/profile", icon: User, label: "Perfil" },
    ],
    secondary: [
      { path: "/goals", icon: Target, label: "Metas" },
      { path: "/goal-performance", icon: BarChart3, label: "Performance" },
      { path: "/conversion-analysis", icon: PieChart, label: "Conversão" },
      { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
      { path: "/manual", icon: FileText, label: "Manual" },
      { path: "/culture", icon: Heart, label: "Cultura" },
    ],
  },
  supervisor: {
    primary: [
      { path: "/supervisor-dashboard", icon: Home, label: "Home" },
      { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
      { path: "/profile", icon: User, label: "Perfil" },
    ],
    secondary: [
      { path: "/manual", icon: FileText, label: "Manual" },
      { path: "/culture", icon: Heart, label: "Cultura" },
    ],
  },
  manager: {
    primary: [
      { path: "/manager-dashboard", icon: Home, label: "Home" },
      { path: "/crm", icon: Users, label: "CRM" },
      { path: "/sales", icon: ShoppingBag, label: "Vendas" },
      { path: "/profile", icon: User, label: "Perfil" },
    ],
    secondary: [
      { path: "/goals", icon: Target, label: "Metas" },
      { path: "/goal-performance", icon: BarChart3, label: "Performance" },
      { path: "/conversion-analysis", icon: PieChart, label: "Conversão" },
      { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
      { path: "/manual", icon: FileText, label: "Manual" },
      { path: "/culture", icon: Heart, label: "Cultura" },
    ],
  },
  seller: {
    primary: [
      { path: "/dashboard", icon: Home, label: "Home" },
      { path: "/crm", icon: Users, label: "CRM" },
      { path: "/sales", icon: ShoppingBag, label: "Vendas" },
      { path: "/profile", icon: User, label: "Perfil" },
    ],
    secondary: [
      { path: "/content-center", icon: BookOpen, label: "Conteúdo" },
      { path: "/manual", icon: FileText, label: "Manual" },
      { path: "/culture", icon: Heart, label: "Cultura" },
    ],
  },
};

interface AppLayoutProps {
  children: ReactNode;
  showFab?: boolean;
}

const AppLayout = ({ children, showFab = true }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  useDynamicFavicon();

  const resolvedRole = role ?? null;
  const navConfig = useMemo(() => {
    if (!resolvedRole) {
      return {
        primary: [{ path: getDashboardByRole(null), icon: Home, label: "Home" }],
        secondary: [] as NavItem[],
      };
    }

    return roleNavigation[resolvedRole];
  }, [resolvedRole]);

  const shouldShowFab = showFab && canSell(resolvedRole);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {shouldShowFab && (
        <motion.div
          className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8"
          whileTap={{ scale: 0.9 }}
        >
          <Button
            variant="fab"
            size="fab"
            onClick={() => navigate("/new-attendance")}
            aria-label="Novo Atendimento"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navConfig.primary.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors"
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col z-50">
        <div className="p-6">
          <OrgLogo />
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navConfig.primary.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}

          {navConfig.secondary.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ferramentas</p>
              </div>
              {navConfig.secondary.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </aside>
    </div>
  );
};

export default AppLayout;
