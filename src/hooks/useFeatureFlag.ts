import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads a boolean feature flag from public.platform_settings.
 * Defaults to `false` while loading or on error.
 */
export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setEnabled(false);
      } else {
        setEnabled(data.value === true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { enabled, loading };
}
