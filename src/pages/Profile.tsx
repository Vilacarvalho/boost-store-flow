import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronRight, User, Store, Target, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";

const mockUser = {
  name: "Carlos Souza",
  email: "carlos@loja.com",
  role: "Vendedor",
  store: "Ótica Central - Shopping",
};

const menuItems = [
  { label: "Meus Dados", icon: User },
  { label: "Minha Loja", icon: Store },
  { label: "Minhas Metas", icon: Target },
  { label: "Notificações", icon: Bell },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">CS</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {mockUser.name}
              </h1>
              <p className="text-sm text-muted-foreground">{mockUser.role}</p>
              <p className="text-xs text-muted-foreground">{mockUser.store}</p>
            </div>
          </motion.div>

          {/* Menu */}
          <div className="space-y-1">
            {menuItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1 text-left">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/login")}
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl"
          >
            <LogOut className="h-5 w-5" />
            Sair da conta
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
