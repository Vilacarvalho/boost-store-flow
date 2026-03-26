import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, getDashboardByRole } from "@/lib/roleRedirect";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

const LOADING_TIMEOUT_MS = 12000;

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, role, loading, profile, profileError, signOut } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn("[ProtectedRoute] Loading timeout reached");
      setTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && session && profile && !profile.active) {
      signOut().then(() => navigate("/login", { replace: true }));
    }
  }, [loading, session, profile, signOut, navigate]);

  // Handle timeout — clear stale session
  useEffect(() => {
    if (timedOut && loading) {
      console.warn("[ProtectedRoute] Timeout while loading — redirecting to login");
      signOut().then(() => navigate("/login", { replace: true }));
    }
    if (timedOut && !loading && session && allowedRoles && !role) {
      console.warn("[ProtectedRoute] Timeout: session exists but no role — redirecting");
      signOut().then(() => navigate("/login", { replace: true }));
    }
  }, [timedOut, loading, session, role, allowedRoles, signOut, navigate]);

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || profileError) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.active) {
    return <Navigate to="/login" replace />;
  }

  // Still waiting for role on a role-restricted route
  if (allowedRoles && !role) {
    if (timedOut) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
