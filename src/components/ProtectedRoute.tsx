import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardByRole } from "@/lib/roleRedirect";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "manager" | "seller" | "supervisor" | "super_admin")[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // super_admin bypasses all role restrictions
  if (role === "super_admin") {
    return <>{children}</>;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to correct dashboard instead of generic /dashboard
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
