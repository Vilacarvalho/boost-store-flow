import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical, BookOpen, Heart } from "lucide-react";
import { toast } from "sonner";
import { useCulture } from "@/hooks/useCulture";

interface ManualSection {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  organization_id: string;
}

const Manual = () => {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const { data: culture } = useCulture();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ManualSection | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["manual_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ManualSection[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Sem organização");
      if (editingSection) {
        const { error } = await supabase
          .from("manual_sections")
          .update({ title, content })
          .eq("id", editingSection.id);
        if (error) throw error;
      } else {
        const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) + 1 : 0;
        const { error } = await supabase.from("manual_sections").insert({
          title,
          content,
          sort_order: maxOrder,
          organization_id: profile.organization_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual_sections"] });
      closeDialog();
      toast.success(editingSection ? "Seção atualizada" : "Seção criada");
    },
    onError: () => toast.error("Erro ao salvar seção"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual_sections"] });
      toast.success("Seção excluída");
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = sections.findIndex((s) => s.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sections.length) return;
      const a = sections[idx];
      const b = sections[swapIdx];
      await Promise.all([
        supabase.from("manual_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
        supabase.from("manual_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual_sections"] }),
  });

  const openCreate = () => {
    setEditingSection(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (s: ManualSection) => {
    setEditingSection(s);
    setTitle(s.title);
    setContent(s.content);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSection(null);
    setTitle("");
    setContent("");
  };

  return (
    <AppLayout>
      <div className="p-4 md:pl-72 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manual Operacional</h1>
            <p className="text-sm text-muted-foreground">Processos e procedimentos internos</p>
          </div>
          {isAdmin && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nova Seção
            </Button>
          )}
        </div>

        {/* Culture banner */}
        {(culture?.mission || culture?.vision || culture?.values) && (
          <Card
            className="p-4 flex items-start gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate("/culture")}
          >
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm text-foreground">Nossa Cultura</h3>
              {culture?.mission && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{culture.mission}</p>
              )}
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : sections.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma seção cadastrada</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <Card key={section.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                >
                  {isAdmin && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="flex-1 font-medium text-foreground">{section.title}</span>
                  {expandedId === section.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedId === section.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="pt-4 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {section.content}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={() => moveMutation.mutate({ id: section.id, direction: "up" })} disabled={idx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => moveMutation.mutate({ id: section.id, direction: "down" })} disabled={idx === sections.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => openEdit(section)}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(section.id)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Editar Seção" : "Nova Seção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Abertura de loja" />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Descreva o procedimento..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => upsertMutation.mutate()} disabled={!title.trim() || upsertMutation.isPending}>
              {upsertMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Manual;
