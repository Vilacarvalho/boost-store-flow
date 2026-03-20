import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText, Image, Video, Link as LinkIcon, Star, Pin,
  Download, ExternalLink, Trash2, AlertTriangle, Eye
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function getContentIcon(type: string) {
  switch (type) {
    case "pdf": return FileText;
    case "image": return Image;
    case "video": return Video;
    default: return LinkIcon;
  }
}

function getContentUrl(c: any) {
  if (c.content_type === "link") return c.external_url;
  return c.file_url || c.external_url;
}

interface ContentCardProps {
  content: any;
  storeName?: string;
  isAdmin: boolean;
  viewCount?: number;
  viewed?: boolean;
}

export default function ContentCard({ content: c, storeName, isAdmin, viewCount, viewed }: ContentCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const Icon = getContentIcon(c.content_type);
  const url = getContentUrl(c);

  const handleOpen = async () => {
    if (!user) return;
    // Record view (upsert via unique constraint)
    await supabase
      .from("content_views")
      .upsert({ content_id: c.id, user_id: user.id }, { onConflict: "content_id,user_id" });
    queryClient.invalidateQueries({ queryKey: ["content_views"] });
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("contents").delete().eq("id", c.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["contents"] });
    toast.success("Conteúdo removido.");
  };

  const isPinned = c.is_pinned;
  const isRequired = c.is_required;

  return (
    <Card className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
      isRequired ? "ring-2 ring-destructive/40" : isPinned ? "ring-2 ring-primary/30" : ""
    } ${c.is_featured ? "ring-2 ring-warning/30" : ""}`}>
      {/* Top badges */}
      <div className="absolute top-3 right-3 flex gap-1">
        {c.is_featured && <Star className="h-4 w-4 text-warning fill-warning" />}
        {isPinned && <Pin className="h-4 w-4 text-primary" />}
        {isRequired && <AlertTriangle className="h-4 w-4 text-destructive" />}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isRequired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
              {c.title}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
              {isRequired && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
              {isPinned && <Badge variant="outline" className="text-[10px]">Fixado</Badge>}
              {storeName && <Badge variant="outline" className="text-[10px]">{storeName}</Badge>}
              {c.end_date && <Badge variant="outline" className="text-[10px]">até {new Date(c.end_date).toLocaleDateString("pt-BR")}</Badge>}
              {isAdmin && c.content_access && (c.content_access as any[]).map((a: any) => (
                <Badge key={a.role} variant="outline" className="text-[10px] bg-muted/50">{a.role}</Badge>
              ))}
              {isAdmin && viewCount !== undefined && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Eye className="h-3 w-3" /> {viewCount}
                </Badge>
              )}
              {!isAdmin && viewed && (
                <Badge variant="secondary" className="text-[10px]">Visualizado</Badge>
              )}
              {!isAdmin && !viewed && isRequired && (
                <Badge variant="destructive" className="text-[10px]">Não lido</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {c.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
        )}

        {c.content_type === "image" && c.file_url && (
          <img src={c.file_url} alt={c.title} className="w-full h-32 object-cover rounded-md mb-3" />
        )}

        <div className="flex gap-2">
          {url && (
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={handleOpen}>
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
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
