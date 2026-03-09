import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VisitTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await supabase.functions.invoke("track-visit", {
          body: {
            page_url: window.location.origin + location.pathname,
            referrer: document.referrer || "",
            user_agent: navigator.userAgent,
          },
        });
      } catch (e) {
        // Silent fail — don't disrupt user experience
      }
    };

    trackVisit();
  }, [location.pathname]);

  return null;
};

export default VisitTracker;
