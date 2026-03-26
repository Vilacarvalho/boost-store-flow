import { Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StoreOption {
  id: string;
  name: string;
}

interface DashboardScopeSelectorProps {
  stores: StoreOption[];
  selectedScope: string; // "network" or store id
  onScopeChange: (scope: string) => void;
  networkLabel?: string;
}

const DashboardScopeSelector = ({
  stores,
  selectedScope,
  onScopeChange,
  networkLabel = "Rede inteira",
}: DashboardScopeSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
        Visualizando:
      </span>
      <Select value={selectedScope} onValueChange={onScopeChange}>
        <SelectTrigger className="w-auto min-w-[180px] h-8 text-sm bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="network">{networkLabel}</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardScopeSelector;
