import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEMO_EMAIL = "demo@teevents.com";

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsDemoMode(session?.user?.email === DEMO_EMAIL);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsDemoMode(session?.user?.email === DEMO_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, []);

  const demoGuard = (): boolean => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "This is a sample dashboard. Sign up to manage your own tournament!",
      });
      return true;
    }
    return false;
  };

  return { isDemoMode, demoGuard };
}
