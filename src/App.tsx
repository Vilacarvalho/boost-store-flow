import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import SupervisorDashboard from "./pages/SupervisorDashboard.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewAttendance from "./pages/NewAttendance.tsx";
import CRM from "./pages/CRM.tsx";
import Sales from "./pages/Sales.tsx";
import Profile from "./pages/Profile.tsx";
import StoresManagement from "./pages/StoresManagement.tsx";
import UsersManagement from "./pages/UsersManagement.tsx";
import GoalsManagement from "./pages/GoalsManagement.tsx";
import GoalPlanner from "./pages/GoalPlanner.tsx";
import GoalPerformance from "./pages/GoalPerformance.tsx";
import ConversionAnalysis from "./pages/ConversionAnalysis.tsx";
import ContentCenter from "./pages/ContentCenter.tsx";
import Manual from "./pages/Manual.tsx";
import Culture from "./pages/Culture.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-attendance"
              element={
                <ProtectedRoute>
                  <NewAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stores"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <StoresManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <GoalsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goal-planner"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <GoalPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goal-performance"
              element={
                <ProtectedRoute>
                  <GoalPerformance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conversion-analysis"
              element={
                <ProtectedRoute>
                  <ConversionAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-center"
              element={
                <ProtectedRoute>
                  <ContentCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manual"
              element={
                <ProtectedRoute>
                  <Manual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/culture"
              element={
                <ProtectedRoute>
                  <Culture />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
