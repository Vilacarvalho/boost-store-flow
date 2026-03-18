import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageCircle, ChevronRight, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";

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

const mockClients = [
  { id: "1", name: "Maria Oliveira", whatsapp: "11 98888-7777", status: "negotiating", lastContact: "Hoje" },
  { id: "2", name: "João Pedro", whatsapp: "11 97777-6666", status: "new", lastContact: "Ontem" },
  { id: "3", name: "Ana Costa", whatsapp: "11 96666-5555", status: "won", lastContact: "2 dias" },
  { id: "4", name: "Roberto Lima", whatsapp: "11 95555-4444", status: "lost", lastContact: "3 dias" },
  { id: "5", name: "Fernanda Alves", whatsapp: "11 94444-3333", status: "negotiating", lastContact: "Hoje" },
];

const CRM = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = mockClients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout>
      <div className="md:ml-64">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Clientes
            </h1>
            <p className="text-sm text-muted-foreground">{mockClients.length} clientes</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-secondary/50 border-0"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {[
              { id: "all", label: "Todos" },
              { id: "new", label: "Novos" },
              { id: "negotiating", label: "Negociando" },
              { id: "won", label: "Ganhos" },
              { id: "lost", label: "Perdidos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Client List */}
          <div className="space-y-2">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[client.status]}`}>
                      {statusLabels[client.status]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{client.lastContact}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://wa.me/55${client.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-success" />
                  </a>
                  <button className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CRM;
