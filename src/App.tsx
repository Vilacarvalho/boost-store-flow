import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import SupervisorDashboard from "./pages/SupervisorDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import ManagerDashboard from "./pages/ManagerDashboard.tsx";
import PostLoginRedirect from "./pages/PostLoginRedirect.tsx";
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

import GoalPerformance from "./pages/GoalPerformance.tsx";
import ConversionAnalysis from "./pages/ConversionAnalysis.tsx";
import ContentCenter from "./pages/ContentCenter.tsx";
import Manual from "./pages/Manual.tsx";
import Culture from "./pages/Culture.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NetworkSetup from "./pages/NetworkSetup.tsx";
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
              path="/post-login"
              element={
                <ProtectedRoute>
                  <PostLoginRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager-dashboard"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["seller"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-attendance"
              element={
                <ProtectedRoute allowedRoles={["manager", "seller"]}>
                  <NewAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute allowedRoles={["manager", "seller"]}>
                  <CRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={["manager", "seller"]}>
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
                <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                  <StoresManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "super_admin"]}>
                  <GoalsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goal-planner"
              element={<Navigate to="/goals" replace />}
            />
            <Route
              path="/goal-performance"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "seller", "super_admin"]}>
                  <GoalPerformance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conversion-analysis"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "seller", "super_admin"]}>
                  <ConversionAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-center"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "seller", "supervisor", "super_admin"]}>
                  <ContentCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manual"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "seller", "supervisor", "super_admin"]}>
                  <Manual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/culture"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "seller", "supervisor", "super_admin"]}>
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
            <Route
              path="/network-setup"
              element={
                <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                  <NetworkSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor-dashboard"
              element={
                <ProtectedRoute allowedRoles={["supervisor"]}>
                  <SupervisorDashboard />
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
