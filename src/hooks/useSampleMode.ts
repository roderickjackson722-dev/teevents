import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const KEY = "teevents_sample_mode";
const EXPIRY_KEY = "teevents_sample_expires_at";

export function isSampleModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSampleModeActive(active: boolean) {
  try {
    if (active) sessionStorage.setItem(KEY, "1");
    else {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
    }
    window.dispatchEvent(new Event("sample-mode-changed"));
  } catch {
    // ignore
  }
}

export function setSampleExpiry(iso: string | null) {
  try {
    if (iso) sessionStorage.setItem(EXPIRY_KEY, iso);
    else sessionStorage.removeItem(EXPIRY_KEY);
    window.dispatchEvent(new Event("sample-mode-changed"));
  } catch {
    // ignore
  }
}

/** Whole days remaining on a demo-access grant, or null when not applicable. */
export function getSampleDaysRemaining(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const iso = sessionStorage.getItem(EXPIRY_KEY);
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    if (Number.isNaN(ms)) return null;
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  } catch {
    return null;
  }
}


export function useSampleMode() {
  const [params] = useSearchParams();
  const [active, setActive] = useState<boolean>(isSampleModeActive());
  const [daysRemaining, setDaysRemaining] = useState<number | null>(getSampleDaysRemaining());

  useEffect(() => {
    // URL flag activates it; navigating within dashboard keeps sessionStorage set.
    if (params.get("sample") === "1") {
      setSampleModeActive(true);
      setActive(true);
    }
  }, [params]);

  useEffect(() => {
    const onChange = () => {
      setActive(isSampleModeActive());
      setDaysRemaining(getSampleDaysRemaining());
    };
    window.addEventListener("sample-mode-changed", onChange);
    return () => window.removeEventListener("sample-mode-changed", onChange);
  }, []);

  return { isSampleMode: active, sampleDaysRemaining: daysRemaining };

}
