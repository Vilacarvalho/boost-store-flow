import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CultureData {
  id: string;
  organization_id: string;
  mission: string;
  vision: string;
  values: string;
}

export const useCulture = () => {
  return useQuery({
    queryKey: ["culture"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as CultureData | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};
