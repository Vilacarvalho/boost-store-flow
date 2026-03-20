import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageCircle, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/currency";
import { phoneToWhatsApp } from "@/lib/validation";

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

const productTypeLabels: Record<string, string> = {
  solar: "Solar",
  armacao: "Armação",
  lente: "Lente",
};

interface SaleHistory {
  id: string;
  status: string;
  product_type: string | null;
  products_count: number | null;
  total_value: number | null;
  objection_reason: string | null;
  objection_description: string | null;
  notes: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  status: string;
  created_at: string;
}

const CRM = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [salesHistory, setSalesHistory] = useState<Record<string, SaleHistory[]>>({});

  useEffect(() => {
    if (!profile?.store_id) return;
    const fetchCustomers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customers")
        .select("id, name, whatsapp, status, created_at")
        .eq("store_id", profile.store_id!)
        .order("created_at", { ascending: false });
      if (data) setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, [profile?.store_id]);

  const toggleExpand = async (customerId: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    if (!salesHistory[customerId]) {
      const { data } = await supabase
        .from("sales")
        .select("id, status, product_type, products_count, total_value, objection_reason, objection_description, notes, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setSalesHistory(prev => ({ ...prev, [customerId]: data as SaleHistory[] }));
    }
  };

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
                  className="bg-card rounded-2xl shadow-card overflow-hidden">
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(client.id)}>
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
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
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors">
                          <MessageCircle className="h-4 w-4 text-success" />
                        </a>
                      )}
                      {expandedId === client.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Sale History */}
                  {expandedId === client.id && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-3 mb-2">Histórico de Atendimentos</p>
                      {!salesHistory[client.id] ? (
                        <div className="flex justify-center py-3">
                          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      ) : salesHistory[client.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Nenhum atendimento registrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {salesHistory[client.id].map((sale) => (
                            <div key={sale.id} className="bg-secondary/30 rounded-xl p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${sale.status === "won" ? "bg-success" : "bg-destructive"}`} />
                                  <span className="text-xs font-medium text-foreground">
                                    {sale.status === "won" ? "Comprou" : "Não comprou"}
                                  </span>
                                  {sale.product_type && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                      {productTypeLabels[sale.product_type] || sale.product_type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(sale.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {sale.status === "won" && sale.total_value ? (
                                  <span className="text-success font-medium tabular-nums">{formatBRL(sale.total_value)}</span>
                                ) : null}
                                {sale.status === "won" && sale.products_count ? (
                                  <span className="flex items-center gap-0.5"><Package className="h-3 w-3" /> P.A. {sale.products_count}</span>
                                ) : null}
                                {sale.status === "lost" && sale.objection_reason && (
                                  <span className="text-destructive">Motivo: {sale.objection_reason}</span>
                                )}
                              </div>
                              {sale.status === "lost" && sale.objection_reason === "Outro" && sale.objection_description && (
                                <p className="text-[10px] text-muted-foreground italic">"{sale.objection_description}"</p>
                              )}
                              {sale.notes && (
                                <p className="text-[10px] text-muted-foreground">Obs: {sale.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
