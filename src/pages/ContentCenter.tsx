import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search } from "lucide-react";
import ContentCard from "@/components/content-center/ContentCard";
import ContentForm from "@/components/content-center/ContentForm";
import CategoryManager, { useCategories } from "@/components/content-center/CategoryManager";
import AdminStats from "@/components/content-center/AdminStats";

const DEFAULT_CATEGORIES = [
  "Processos", "Campanhas", "Técnicas de venda",
  "Treinamentos", "Comunicados", "Produtos",
];

const CONTENT_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "link", label: "Link externo" },
];

const ContentCenter = () => {
  const { profile, role, user } = useAuth();
  const isAdmin = role === "admin" || role === "super_admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [extraFilter, setExtraFilter] = useState("all");

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("active", true);
      return data ?? [];
    },
  });

  const { data: customCategories } = useCategories();

  // Categories visible to current role: active ones whose allowed_roles includes current role (or all for admin)
  const visibleCategories = useMemo(() => {
    if (!customCategories) return [];
    return customCategories.filter((c) => {
      if (isAdmin) return true; // admin/super_admin see all for management
      return c.is_active && (c.allowed_roles ?? []).includes(role ?? "");
    });
  }, [customCategories, role, isAdmin]);

  const allCategories = useMemo(() => {
    const custom = visibleCategories.map((c) => c.name);
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...custom])];
    return merged.sort();
  }, [visibleCategories]);

  // Build a set of inactive category names for filtering content
  const inactiveCategoryNames = useMemo(() => {
    if (!customCategories) return new Set<string>();
    return new Set(customCategories.filter(c => !c.is_active).map(c => c.name));
  }, [customCategories]);

  // Build a map of category name → allowed_roles
  const categoryRolesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (customCategories ?? []).forEach(c => {
      map[c.name] = c.allowed_roles;
    });
    return map;
  }, [customCategories]);

  const { data: contents, isLoading } = useQuery({
    queryKey: ["contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*, content_access(role)")
        .order("is_pinned", { ascending: false })
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: views } = useQuery({
    queryKey: ["content_views"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_views").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const viewCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (views ?? []).forEach((v: any) => {
      map[v.content_id] = (map[v.content_id] || 0) + 1;
    });
    return map;
  }, [views]);

  const myViewed = useMemo(() => {
    const set = new Set<string>();
    (views ?? []).forEach((v: any) => {
      if (v.user_id === user?.id) set.add(v.content_id);
    });
    return set;
  }, [views, user]);

  const adminStats = useMemo(() => {
    if (!contents) return { totalActive: 0, totalRequired: 0, expiringSoon: 0, totalViews: 0 };
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return {
      totalActive: contents.length,
      totalRequired: contents.filter((c: any) => c.is_required).length,
      expiringSoon: contents.filter((c: any) => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= now && end <= soon;
      }).length,
      totalViews: (views ?? []).length,
    };
  }, [contents, views]);

  // Filter contents with category governance
  const filtered = useMemo(() => {
    if (!contents) return [];
    return contents.filter((c: any) => {
      // Category governance: hide content in inactive categories for non-admins
      if (!isAdmin && inactiveCategoryNames.has(c.category)) return false;

      // Category role governance: if category has allowed_roles, check user role
      if (!isAdmin && categoryRolesMap[c.category]) {
        const catRoles = categoryRolesMap[c.category];
        if (!catRoles.includes(role ?? "")) return false;
      }

      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (typeFilter !== "all" && c.content_type !== typeFilter) return false;
      if (storeFilter !== "all" && c.store_id && c.store_id !== storeFilter) return false;
      if (extraFilter === "required" && !c.is_required) return false;
      if (extraFilter === "pinned" && !c.is_pinned) return false;
      if (extraFilter === "unread" && myViewed.has(c.id)) return false;
      if (extraFilter === "expiring") {
        if (!c.end_date) return false;
        const now = new Date();
        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        const end = new Date(c.end_date);
        if (end < now || end > soon) return false;
      }
      return true;
    });
  }, [contents, search, categoryFilter, typeFilter, storeFilter, extraFilter, myViewed, isAdmin, inactiveCategoryNames, categoryRolesMap, role]);

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Central de Conteúdo
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Materiais, treinamentos e comunicados da equipe
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <CategoryManager />
                <ContentForm stores={stores ?? []} categories={allCategories} />
              </div>
            )}
          </div>

          {isAdmin && (
            <AdminStats
              totalActive={adminStats.totalActive}
              totalRequired={adminStats.totalRequired}
              expiringSoon={adminStats.expiringSoon}
              totalViews={adminStats.totalViews}
            />
          )}

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar conteúdo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos tipos</SelectItem>
                    {CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={extraFilter} onValueChange={setExtraFilter}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filtro" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="required">Obrigatórios</SelectItem>
                    <SelectItem value="pinned">Fixados</SelectItem>
                    <SelectItem value="unread">Não visualizados</SelectItem>
                    <SelectItem value="expiring">Expirando em breve</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Loja" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas lojas</SelectItem>
                      {stores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum conteúdo encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c: any) => {
                const storeName = stores?.find((s) => s.id === c.store_id)?.name;
                return (
                  <ContentCard
                    key={c.id}
                    content={c}
                    storeName={storeName}
                    isAdmin={isAdmin}
                    viewCount={viewCounts[c.id] || 0}
                    viewed={myViewed.has(c.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ContentCenter;
