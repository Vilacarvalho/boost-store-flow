import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager" | "seller" | "supervisor" | "super_admin";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  organization_id: string | null;
  store_id: string | null;
  active: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  loading: boolean;
  deactivatedMessage: string | null;
  clearDeactivatedMessage: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string): Promise<boolean> => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    const prof = profileRes.data ? (profileRes.data as UserProfile) : null;

    if (prof && !prof.active) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setDeactivatedMessage("Seu acesso está desativado. Procure o administrador.");
      return false;
    }

    setProfile(prof);
    setRole(roleRes.data ? (roleRes.data.role as AppRole) : null);
    return true;
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    let isMounted = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!isMounted) return;

      setLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        if (nextSession?.user) {
          await fetchProfileAndRole(nextSession.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Failed to load profile/role:", error);
        setProfile(null);
        setRole(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void syncSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, role, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
