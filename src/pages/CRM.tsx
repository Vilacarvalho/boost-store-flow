import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MessageCircle, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusColors: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  negotiating: "bg-warning/10 text-warning",
  lost: "bg-destructive/10 text-destructive",
  won: "bg-success/10 text-success",
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  negotiating: "Em negociação",
  lost: "Perdido",
  won: "Ganho",
};

interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  status: string;
  created_at: string;
}

const CRM = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.store_id) return;

    const fetchCustomers = async () => {
      setLoading(true);
      let query = supabase
        .from("customers")
        .select("id, name, whatsapp, status, created_at")
        .eq("store_id", profile.store_id!)
        .order("created_at", { ascending: false });

      const { data } = await query;
      if (data) setCustomers(data);
      setLoading(false);
    };

    fetchCustomers();
  }, [profile?.store_id]);

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `${days} dias`;
  };

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{customers.length} clientes</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-10 rounded-xl bg-secondary/50 border-0" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {[
              { id: "all", label: "Todos" },
              { id: "new", label: "Novos" },
              { id: "negotiating", label: "Negociando" },
              { id: "won", label: "Ganhos" },
              { id: "lost", label: "Perdidos" },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-card text-center space-y-2">
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((client, i) => (
                <motion.div key={client.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[client.status] || statusColors.new}`}>
                        {statusLabels[client.status] || client.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{getRelativeTime(client.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {client.whatsapp && (
                      <a href={`https://wa.me/55${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors">
                        <MessageCircle className="h-4 w-4 text-success" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CRM;
