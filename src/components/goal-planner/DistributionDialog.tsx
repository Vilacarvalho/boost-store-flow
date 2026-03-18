import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DistributionMode = "equal" | "proportional" | "manual";

interface Seller {
  id: string;
  name: string;
  historicalValue: number;
  assignedValue: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  goalValue: number;
  organizationId: string;
  targetStart: string;
  targetEnd: string;
  periodType: string;
  goalPlanId: string;
  parentGoalId: string;
  onDistributed: () => void;
}

const DistributionDialog = ({
  open, onClose, storeId, storeName, goalValue,
  organizationId, targetStart, targetEnd, periodType,
  goalPlanId, parentGoalId, onDistributed,
}: Props) => {
  const [mode, setMode] = useState<DistributionMode>("equal");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open || !storeId) return;
    const fetchSellers = async () => {
      setLoading(true);
      // Get sellers for this store
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("active", true);

      if (!profiles || profiles.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      // Get seller roles to filter only sellers
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profiles.map((p) => p.id));

      const sellerIds = new Set(
        (roles || []).filter((r) => r.role === "seller").map((r) => r.user_id)
      );

      // Get historical sales for proportional distribution
      const { data: salesData } = await supabase
        .from("sales")
        .select("seller_id, total_value")
        .eq("store_id", storeId)
        .eq("status", "won");

      const salesByUser = new Map<string, number>();
      (salesData || []).forEach((s) => {
        salesByUser.set(s.seller_id, (salesByUser.get(s.seller_id) || 0) + (s.total_value || 0));
      });

      const sellerProfiles = profiles.filter((p) => sellerIds.has(p.id));
      const equalShare = sellerProfiles.length > 0 ? goalValue / sellerProfiles.length : 0;

      setSellers(
        sellerProfiles.map((p) => ({
          id: p.id,
          name: p.name,
          historicalValue: salesByUser.get(p.id) || 0,
          assignedValue: Math.round(equalShare * 100) / 100,
        }))
      );
      setLoading(false);
    };
    fetchSellers();
  }, [open, storeId, goalValue]);

  useEffect(() => {
    if (sellers.length === 0) return;
    if (mode === "equal") {
      const share = goalValue / sellers.length;
      setSellers((prev) => prev.map((s) => ({ ...s, assignedValue: Math.round(share * 100) / 100 })));
    } else if (mode === "proportional") {
      const totalHist = sellers.reduce((sum, s) => sum + s.historicalValue, 0);
      if (totalHist > 0) {
        setSellers((prev) =>
          prev.map((s) => ({
            ...s,
            assignedValue: Math.round((s.historicalValue / totalHist) * goalValue * 100) / 100,
          }))
        );
      }
    }
  }, [mode, goalValue, sellers.length]);

  const updateManualValue = (id: string, value: string) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, assignedValue: parseFloat(value) || 0 } : s))
    );
  };

  const totalAssigned = sellers.reduce((sum, s) => sum + s.assignedValue, 0);
  const diff = goalValue - totalAssigned;

  const applyDistribution = async () => {
    if (sellers.length === 0) {
      toast.error("Nenhum vendedor encontrado na loja.");
      return;
    }
    setApplying(true);
    try {
      const goalPeriod = "monthly" as const;
      for (const seller of sellers) {
        const { error } = await supabase.from("goals").insert({
          organization_id: organizationId,
          store_id: storeId,
          user_id: seller.id,
          target_value: seller.assignedValue,
          period_type: goalPeriod,
          period_start: targetStart,
          start_date: targetStart,
          end_date: targetEnd,
          source: "planner",
          goal_plan_id: goalPlanId,
          parent_goal_id: parentGoalId,
        } as any);
        if (error) throw error;
      }
      toast.success("Metas distribuídas para os vendedores!");
      onDistributed();
      onClose();
    } catch (e: any) {
      toast.error("Erro ao distribuir: " + e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Distribuir meta — {storeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Meta da loja: <span className="font-semibold text-foreground">
              {goalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <div className="space-y-2">
            <Label>Modo de distribuição</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as DistributionMode)} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="equal" />
                <span className="text-sm">Igualitária</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="proportional" />
                <span className="text-sm">Proporcional</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="manual" />
                <span className="text-sm">Manual</span>
              </label>
            </RadioGroup>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum vendedor ativo nesta loja.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sellers.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    {mode === "proportional" && (
                      <p className="text-xs text-muted-foreground">
                        Histórico: {s.historicalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="w-28 text-right"
                    value={s.assignedValue}
                    onChange={(e) => updateManualValue(s.id, e.target.value)}
                    disabled={mode !== "manual"}
                  />
                </div>
              ))}
              <div className={`text-xs text-right ${Math.abs(diff) > 1 ? "text-destructive" : "text-muted-foreground"}`}>
                Total: {totalAssigned.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                {Math.abs(diff) > 1 && ` (diferença: ${diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={applyDistribution} disabled={applying || sellers.length === 0}>
            {applying ? "Distribuindo..." : "Distribuir Metas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DistributionDialog;
