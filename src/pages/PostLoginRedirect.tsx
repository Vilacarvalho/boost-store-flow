import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardByRole } from "@/lib/roleRedirect";

const REDIRECT_TIMEOUT_MS = 10000;

const PostLoginRedirect = () => {
  const { role, loading, session, profile, profileError, signOut } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout to prevent infinite spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn("[PostLoginRedirect] Timeout waiting for role/profile");
      setTimedOut(true);
    }, REDIRECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!session || profileError) {
      navigate("/login", { replace: true });
      return;
    }

    if (profile && !profile.active) {
      signOut().then(() => navigate("/login", { replace: true }));
      return;
    }

    if (!role) {
      if (timedOut) {
        console.warn("[PostLoginRedirect] No role after timeout — signing out");
        signOut().then(() => navigate("/login", { replace: true }));
      }
      return;
    }

    console.log("[PostLoginRedirect] Redirecting to", getDashboardByRole(role));
    navigate(getDashboardByRole(role), { replace: true });
  }, [role, loading, session, profile, profileError, navigate, signOut, timedOut]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default PostLoginRedirect;
