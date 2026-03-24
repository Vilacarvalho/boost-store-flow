import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardByRole } from "@/lib/roleRedirect";

const PostLoginRedirect = () => {
  const { role, loading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    if (profile && !profile.active) {
      signOut().then(() => navigate("/login", { replace: true }));
      return;
    }

    if (!role) return;

    navigate(getDashboardByRole(role), { replace: true });
  }, [role, loading, session, profile, navigate, signOut]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default PostLoginRedirect;
