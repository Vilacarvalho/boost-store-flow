import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowDown, Clock, UserCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QueueEntry {
  id: string;
  seller_id: string;
  seller_name: string;
  position: number;
  status: string; // "waiting" | "attending"
  entered_at: string;
}

interface TurnQueueProps {
  storeId: string;
  compact?: boolean;
}

const TurnQueue = ({ storeId, compact = false }: TurnQueueProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isEligible = role === "seller" || role === "manager";
  const myEntry = queue.find((e) => e.seller_id === user?.id);
  const attending = queue.find((e) => e.status === "attending");
  const waiting = queue.filter((e) => e.status === "waiting").sort((a, b) => a.position - b.position);
  const nextUp = waiting[0];

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from("turn_queue")
      .select("id, seller_id, position, status, entered_at")
      .eq("store_id", storeId)
      .order("position", { ascending: true });

    if (!data) { setLoading(false); return; }

    // Fetch seller names
    const sellerIds = data.map((d: any) => d.seller_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", sellerIds);

    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nameMap[p.id] = p.name; });

    setQueue(
      data.map((d: any) => ({
        ...d,
        seller_name: nameMap[d.seller_id] || "Vendedor",
      }))
    );
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchQueue();

    // Realtime subscription
    const channel = supabase
      .channel(`turn-queue-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "turn_queue", filter: `store_id=eq.${storeId}` }, () => {
        fetchQueue();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId, fetchQueue]);

  const getNextPosition = () => {
    if (queue.length === 0) return 1;
    return Math.max(...queue.map((e) => e.position)) + 1;
  };

  const joinQueue = async () => {
    if (!user || myEntry) return;
    const { error } = await supabase.from("turn_queue").insert({
      store_id: storeId,
      seller_id: user.id,
      position: getNextPosition(),
      status: "waiting",
    } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const leaveQueue = async () => {
    if (!myEntry) return;
    const { error } = await supabase.from("turn_queue").delete().eq("id", myEntry.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const startAttending = async () => {
    if (!myEntry) return;
    // Can only start if no one else is attending
    if (attending && attending.seller_id !== user?.id) {
      toast({ title: "Aguarde", description: `${attending.seller_name} está em atendimento.`, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("turn_queue")
      .update({ status: "attending", updated_at: new Date().toISOString() } as any)
      .eq("id", myEntry.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const finishAttending = async () => {
    if (!myEntry) return;
    // Remove from queue, then re-add at end
    await supabase.from("turn_queue").delete().eq("id", myEntry.id);
    // Re-join at end
    const { data: currentQueue } = await supabase
      .from("turn_queue")
      .select("position")
      .eq("store_id", storeId)
      .order("position", { ascending: false })
      .limit(1);

    const newPos = currentQueue && currentQueue.length > 0 ? (currentQueue[0] as any).position + 1 : 1;
    await supabase.from("turn_queue").insert({
      store_id: storeId,
      seller_id: user!.id,
      position: newPos,
      status: "waiting",
    } as any);
  };

  // Manager: remove someone from queue
  const removeFromQueue = async (entryId: string) => {
    await supabase.from("turn_queue").delete().eq("id", entryId);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lista da Vez</span>
        </div>
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lista da Vez</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{queue.length} na fila</span>
      </div>

      {/* Currently attending */}
      {attending && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Em atendimento</p>
            <p className="text-sm font-medium text-foreground truncate">{attending.seller_name}</p>
          </div>
          {attending.seller_id === user?.id && (
            <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={finishAttending}>
              <RotateCcw className="h-3 w-3 mr-1" /> Finalizar
            </Button>
          )}
        </div>
      )}

      {/* Next up */}
      {nextUp && !attending && (
        <div className="rounded-xl bg-warning/5 border border-warning/20 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Próximo</p>
            <p className="text-sm font-medium text-foreground truncate">{nextUp.seller_name}</p>
          </div>
          {nextUp.seller_id === user?.id && (
            <Button size="sm" className="rounded-lg text-xs h-7" onClick={startAttending}>
              Iniciar
            </Button>
          )}
        </div>
      )}

      {/* Queue list */}
      {!compact && waiting.length > 0 && (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {waiting.map((entry, i) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <span className="text-xs font-semibold text-muted-foreground w-5 text-center tabular-nums">{i + 1}</span>
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                  {entry.seller_name.charAt(0)}
                </div>
                <p className="text-sm text-foreground flex-1 truncate">{entry.seller_name}</p>
                {entry.seller_id === user?.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Você</span>
                )}
                {role === "manager" && entry.seller_id !== user?.id && (
                  <button onClick={() => removeFromQueue(entry.id)} className="text-[10px] text-destructive hover:underline">
                    Remover
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {queue.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum vendedor na fila.</p>
      )}

      {/* Action buttons */}
      {isEligible && (
        <div className="pt-1">
          {!myEntry ? (
            <Button size="sm" className="w-full rounded-xl text-xs" onClick={joinQueue}>
              <ArrowDown className="h-3 w-3 mr-1" /> Entrar na fila
            </Button>
          ) : myEntry.status === "waiting" ? (
            <Button size="sm" variant="outline" className="w-full rounded-xl text-xs" onClick={leaveQueue}>
              Sair da fila
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TurnQueue;
