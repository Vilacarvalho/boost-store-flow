import { useState, useRef } from "react";
import { Upload, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";

const PRESET_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706",
  "#0891b2", "#be185d", "#4f46e5", "#15803d", "#9333ea",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CompanySettingsDialog = ({ open, onOpenChange }: Props) => {
  const { profile } = useAuth();
  const { data: org } = useOrganization();
  const queryClient = useQueryClient();
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [shortName, setShortName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v && org) {
      setCompanyName(org.name || "");
      setShortName(org.short_name || "");
      setTagline(org.tagline || "");
      setPrimaryColor(org.primary_color || "");
      setSecondaryColor(org.secondary_color || "");
    }
    onOpenChange(v);
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo: 2MB"); return; }
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) { toast.error("Use PNG, JPG ou SVG"); return; }
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.organization_id}/logo.${ext}`;
      await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
      await supabase.from("organizations").update({ logo_url: urlData.publicUrl } as any).eq("id", profile.organization_id);
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Logo atualizada!");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleRemoveLogo = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      await supabase.from("organizations").update({ logo_url: null } as any).eq("id", profile.organization_id);
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Logo removida!");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const updates: any = {};
      if (companyName.trim()) updates.name = companyName.trim();
      if (shortName.trim() !== (org?.short_name || "")) updates.short_name = shortName.trim() || null;
      if (tagline.trim() !== (org?.tagline || "")) updates.tagline = tagline.trim() || null;

      // Validate color format
      const colorRegex = /^#[0-9a-fA-F]{6}$/;
      if (primaryColor && !colorRegex.test(primaryColor)) {
        toast.error("Cor primária inválida. Use formato #RRGGBB"); setSaving(false); return;
      }
      if (secondaryColor && !colorRegex.test(secondaryColor)) {
        toast.error("Cor secundária inválida. Use formato #RRGGBB"); setSaving(false); return;
      }

      updates.primary_color = primaryColor || null;
      updates.secondary_color = secondaryColor || null;

      const { error } = await supabase.from("organizations").update(updates as any).eq("id", profile.organization_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Configurações salvas!");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações da Empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Logo</Label>
            {org?.logo_url ? (
              <div className="flex items-center gap-3">
                <img src={org.logo_url} alt="Logo" className="h-12 w-auto max-w-[140px] rounded-lg object-contain border border-border" />
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={saving}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> Trocar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={saving} className="text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-5 hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Enviar logo (PNG, JPG, SVG)</span>
              </button>
            )}
            <input ref={logoFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome completo" />
          </div>

          {/* Short name */}
          <div className="space-y-2">
            <Label>Nome curto <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Ex: VilaCar" />
            <p className="text-xs text-muted-foreground">Usado na sidebar quando o nome completo é longo.</p>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label>Tagline <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: Excelência em Ótica" />
            <p className="text-xs text-muted-foreground">Aparece abaixo do nome na navegação.</p>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Cor primária <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
                className="flex-1"
              />
              {primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) && (
                <div className="h-9 w-9 rounded-lg border border-border shrink-0" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPrimaryColor(c)}
                  className={`h-7 w-7 rounded-lg border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {primaryColor && (
                <button
                  type="button"
                  onClick={() => setPrimaryColor("")}
                  className="h-7 px-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent"
                >
                  Limpar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Aplicada em destaques leves da interface. O tema principal é preservado.</p>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <Label>Cor secundária <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div className="flex items-center gap-2">
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#7c3aed"
                className="flex-1"
              />
              {secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor) && (
                <div className="h-9 w-9 rounded-lg border border-border shrink-0" style={{ backgroundColor: secondaryColor }} />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !companyName.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanySettingsDialog;
