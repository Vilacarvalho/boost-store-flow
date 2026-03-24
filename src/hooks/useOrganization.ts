import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  short_name: string | null;
  tagline: string | null;
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
        .select("id, name, logo_url, primary_color, secondary_color, short_name, tagline")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
