import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
  profileError: boolean;
  deactivatedMessage: string | null;
  clearDeactivatedMessage: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADING_TIMEOUT_MS = 15000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [deactivatedMessage, setDeactivatedMessage] = useState<string | null>(null);
  const clearDeactivatedMessage = () => setDeactivatedMessage(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const startLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(async () => {
      console.warn("[Auth] Loading timeout reached — clearing stale session");
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setProfileError(true);
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);
  };

  const fetchProfileAndRole = async (userId: string): Promise<boolean> => {
    console.log("[Auth] fetchProfileAndRole start", userId);

    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    console.log("[Auth] profile result:", profileRes.data ? "found" : "NOT FOUND", "error:", profileRes.error?.message || "none");
    console.log("[Auth] role result:", roleRes.data ? roleRes.data.role : "NOT FOUND", "error:", roleRes.error?.message || "none");

    const prof = profileRes.data ? (profileRes.data as UserProfile) : null;

    if (!prof) {
      console.warn("[Auth] No profile found for user — signing out");
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setProfileError(true);
      return false;
    }

    if (!prof.active) {
      console.warn("[Auth] User inactive — signing out");
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setDeactivatedMessage("Seu acesso está desativado. Procure o administrador.");
      return false;
    }

    const userRole = roleRes.data ? (roleRes.data.role as AppRole) : null;

    if (!userRole) {
      console.warn("[Auth] No role found for user — signing out");
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      setProfileError(true);
      return false;
    }

    console.log("[Auth] Auth complete — role:", userRole, "org:", prof.organization_id, "store:", prof.store_id, "active:", prof.active);

    setProfile(prof);
    setRole(userRole);
    setProfileError(false);
    return true;
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    let isMounted = true;
    let syncInProgress = false;

    const syncSession = async (nextSession: Session | null) => {
      if (!isMounted) return;
      if (syncInProgress) {
        console.log("[Auth] syncSession skipped — already in progress");
        return;
      }

      syncInProgress = true;
      setLoading(true);
      setProfileError(false);
      clearLoadingTimeout();

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        if (nextSession?.user) {
          console.log("[Auth] Session found — loading profile for", nextSession.user.email);
          startLoadingTimeout();
          const ok = await fetchProfileAndRole(nextSession.user.id);
          clearLoadingTimeout();
          if (!ok) {
            console.warn("[Auth] fetchProfileAndRole returned false");
          }
        } else {
          console.log("[Auth] No session — clearing state");
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("[Auth] Failed to load profile/role:", error);
        setProfile(null);
        setRole(null);
        setProfileError(true);
        clearLoadingTimeout();
        // Clear stale session that can't load profile
        if (nextSession) {
          console.warn("[Auth] Clearing stale session after error");
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } finally {
        syncInProgress = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      console.log("[Auth] onAuthStateChange event:", _event);
      void syncSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      console.log("[Auth] getSession result:", nextSession ? "has session" : "no session");
      void syncSession(nextSession);
    });

    return () => {
      isMounted = false;
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setProfileError(false);
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
    setProfileError(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, role, loading, profileError, deactivatedMessage, clearDeactivatedMessage, signIn, signUp, signOut, refreshProfile }}
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
