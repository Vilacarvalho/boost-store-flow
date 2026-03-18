import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, ShoppingBag, User, Plus, Store, Target, Calculator, BarChart3, PieChart, BookOpen, FileText, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/crm", icon: Users, label: "CRM" },
  { path: "/sales", icon: ShoppingBag, label: "Vendas" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const adminNavItems = [
  { path: "/stores", icon: Store, label: "Lojas", roles: ["admin"] },
  { path: "/users", icon: Users, label: "Usuários", roles: ["admin"] },
  { path: "/goals", icon: Target, label: "Metas", roles: ["admin", "manager"] },
  { path: "/goal-planner", icon: Calculator, label: "Planejador de Metas", roles: ["admin"] },
  { path: "/goal-performance", icon: BarChart3, label: "Performance de Metas", roles: ["admin", "manager", "seller"] },
  { path: "/conversion-analysis", icon: PieChart, label: "Análise de Conversão", roles: ["admin", "manager", "seller"] },
  { path: "/content-center", icon: BookOpen, label: "Central de Conteúdo", roles: ["admin", "manager", "seller"] },
  { path: "/manual", icon: FileText, label: "Manual", roles: ["admin", "manager", "seller"] },
  { path: "/culture", icon: Heart, label: "Cultura", roles: ["admin", "manager", "seller"] },
];

interface AppLayoutProps {
  children: ReactNode;
  showFab?: boolean;
}

const AppLayout = ({ children, showFab = true }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const visibleAdminItems = adminNavItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* FAB - New Attendance */}
      {showFab && (
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

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
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

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col z-50">
        <div className="p-6">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            VendaMais
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de Performance
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
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

          {/* Admin section */}
          {visibleAdminItems.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
              </div>
              {visibleAdminItems.map((item) => {
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
