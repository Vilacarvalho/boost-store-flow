import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, FileText, Image, Video, Link as LinkIcon } from "lucide-react";

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

interface ContentFormProps {
  stores: { id: string; name: string }[];
  categories: string[];
}

export default function ContentForm({ stores, categories }: ContentFormProps) {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: categories[0] || "Comunicados",
    content_type: "link",
    external_url: "",
    store_id: "" as string,
    is_featured: false,
    is_pinned: false,
    is_required: false,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    roles: ["admin", "manager", "seller"] as ("admin" | "manager" | "seller")[],
  });

  function resetForm() {
    setForm({
      title: "", description: "", category: categories[0] || "Comunicados", content_type: "link",
      external_url: "", store_id: "", is_featured: false, is_pinned: false, is_required: false,
      start_date: new Date().toISOString().split("T")[0], end_date: "",
      roles: ["admin", "manager", "seller"],
    });
    setFile(null);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id || !user) throw new Error("Sem organização");

      let file_url: string | null = null;
      if (file && ["pdf", "image", "video"].includes(form.content_type)) {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${profile.organization_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("content-files").upload(path, file);
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
          is_pinned: form.is_pinned,
          is_required: form.is_required,
          start_date: form.start_date,
          end_date: form.end_date || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const accessRows = form.roles.map((r) => ({ content_id: content.id, role: r }));
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

  return (
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
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

          {["pdf", "image", "video"].includes(form.content_type) && (
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
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              <Label>Destaque</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_pinned} onCheckedChange={(v) => setForm({ ...form, is_pinned: v })} />
              <Label>Fixado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
              <Label>Obrigatório</Label>
            </div>
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
  );
}
