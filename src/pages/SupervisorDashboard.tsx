import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StoreOverview } from "@/components/supervisor/StoreOverview";
import { VisitAgenda } from "@/components/supervisor/VisitAgenda";
import { VisitHistory } from "@/components/supervisor/VisitHistory";
import { CalendarDays, BarChart3, ClipboardList } from "lucide-react";

const SupervisorDashboard = () => {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 md:ml-64 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Supervisor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o desempenho das lojas e gerencie suas visitas
          </p>
        </div>

        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Lojas</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            <StoreOverview />
          </TabsContent>
          <TabsContent value="agenda">
            <VisitAgenda />
          </TabsContent>
          <TabsContent value="history">
            <VisitHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SupervisorDashboard;
