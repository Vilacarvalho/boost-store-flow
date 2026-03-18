import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FileText, Image, Video, Link as LinkIcon, Star, Search,
  Plus, Download, ExternalLink, Upload, BookOpen, Trash2
} from "lucide-react";

const CATEGORIES = [
  "Processos", "Campanhas", "Técnicas de venda",
  "Treinamentos", "Comunicados", "Produtos",
];

const CONTENT_TYPES = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "image", label: "Imagem", icon: Image },
  { value: "video", label: "Vídeo", icon: Video },
  { value: "link", label: "Link externo", icon: LinkIcon },
];

const ROLES: { value: "admin" | "manager" | "seller"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Gerente" },
  { value: "seller", label: "Vendedor" },
];

function getContentIcon(type: string) {
  switch (type) {
    case "pdf": return FileText;
    case "image": return Image;
    case "video": return Video;
    default: return LinkIcon;
  }
}

const ContentCenter = () => {
  const { profile, role, user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Comunicados",
    content_type: "link",
    external_url: "",
    store_id: "" as string,
    is_featured: false,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    roles: ["admin", "manager", "seller"] as ("admin" | "manager" | "seller")[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch stores (for admin filter & form)
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("active", true);
      return data ?? [];
    },
  });

  // Fetch contents
  const { data: contents, isLoading } = useQuery({
    queryKey: ["contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*, content_access(role)")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Filter contents
  const filtered = useMemo(() => {
    if (!contents) return [];
    return contents.filter((c: any) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (typeFilter !== "all" && c.content_type !== typeFilter) return false;
      if (storeFilter !== "all" && c.store_id && c.store_id !== storeFilter) return false;
      return true;
    });
  }, [contents, search, categoryFilter, typeFilter, storeFilter]);

  // Create content mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id || !user) throw new Error("Sem organização");

      let file_url: string | null = null;

      if (file && (form.content_type === "pdf" || form.content_type === "image" || form.content_type === "video")) {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${profile.organization_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("content-files")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("content-files").getPublicUrl(path);
        file_url = urlData.publicUrl;
        setUploading(false);
      }

      const { data: content, error } = await supabase
        .from("contents")
        .insert({
          organization_id: profile.organization_id,
          store_id: form.store_id || null,
          title: form.title,
          description: form.description || null,
          category: form.category,
          content_type: form.content_type,
          file_url,
          external_url: form.external_url || null,
          is_featured: form.is_featured,
          start_date: form.start_date,
          end_date: form.end_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert access roles
      const accessRows = form.roles.map((r) => ({
        content_id: content.id,
        role: r,
      }));
      const { error: accessError } = await supabase.from("content_access").insert(accessRows);
      if (accessError) throw accessError;

      return content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Conteúdo publicado com sucesso!");
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error("Erro ao publicar: " + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.success("Conteúdo removido.");
    },
  });

  function resetForm() {
    setForm({
      title: "", description: "", category: "Comunicados", content_type: "link",
      external_url: "", store_id: "", is_featured: false,
      start_date: new Date().toISOString().split("T")[0], end_date: "",
      roles: ["admin", "manager", "seller"],
    });
    setFile(null);
  }

  function getContentUrl(c: any) {
    if (c.content_type === "link") return c.external_url;
    return c.file_url || c.external_url;
  }

  return (
    <AppLayout showFab={false}>
      <div className="md:ml-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header */}
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Conteúdo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Publicar Conteúdo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Título *</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Categoria</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(form.content_type === "pdf" || form.content_type === "image" || form.content_type === "video") && (
                      <div>
                        <Label>Arquivo</Label>
                        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      </div>
                    )}

                    {(form.content_type === "link" || form.content_type === "video") && (
                      <div>
                        <Label>{form.content_type === "video" ? "URL do vídeo (opcional se upload)" : "URL externa *"}</Label>
                        <Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." />
                      </div>
                    )}

                    <div>
                      <Label>Loja (vazio = todas)</Label>
                      <Select value={form.store_id || "all"} onValueChange={(v) => setForm({ ...form, store_id: v === "all" ? "" : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as lojas</SelectItem>
                          {stores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-2 block">Perfis com acesso</Label>
                      <div className="flex gap-4">
                        {ROLES.map((r) => (
                          <label key={r.value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={form.roles.includes(r.value)}
                              onCheckedChange={(checked) => {
                                setForm({
                                  ...form,
                                  roles: checked
                                    ? [...form.roles, r.value]
                                    : form.roles.filter((x) => x !== r.value),
                                });
                              }}
                            />
                            {r.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data início</Label>
                        <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                      </div>
                      <div>
                        <Label>Data fim (opcional)</Label>
                        <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                      <Label>Destaque</Label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => createMutation.mutate()}
                      disabled={!form.title || createMutation.isPending || uploading}
                    >
                      {uploading ? "Enviando arquivo..." : createMutation.isPending ? "Publicando..." : "Publicar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar conteúdo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos tipos</SelectItem>
                    {CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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

          {/* Content grid */}
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
                const Icon = getContentIcon(c.content_type);
                const url = getContentUrl(c);
                const storeName = stores?.find((s) => s.id === c.store_id)?.name;
                return (
                  <Card key={c.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${c.is_featured ? "ring-2 ring-primary/30" : ""}`}>
                    {c.is_featured && (
                      <div className="absolute top-3 right-3">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                            {c.title}
                          </CardTitle>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                            {storeName && <Badge variant="outline" className="text-[10px]">{storeName}</Badge>}
                            {c.end_date && <Badge variant="outline" className="text-[10px]">até {new Date(c.end_date).toLocaleDateString("pt-BR")}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                      )}

                      {/* Preview for images */}
                      {c.content_type === "image" && c.file_url && (
                        <img src={c.file_url} alt={c.title} className="w-full h-32 object-cover rounded-md mb-3" />
                      )}

                      <div className="flex gap-2">
                        {url && (
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              {c.content_type === "link" ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                              {c.content_type === "link" ? "Abrir" : "Download"}
                            </a>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
