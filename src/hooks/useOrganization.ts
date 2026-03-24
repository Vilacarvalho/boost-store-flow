import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export function useOrganization() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery<Organization | null>({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}
