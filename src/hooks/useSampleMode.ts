import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const KEY = "teevents_sample_mode";

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
    else sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event("sample-mode-changed"));
  } catch {
    // ignore
  }
}

export function useSampleMode() {
  const [params] = useSearchParams();
  const [active, setActive] = useState<boolean>(isSampleModeActive());

  useEffect(() => {
    // URL flag activates it; navigating within dashboard keeps sessionStorage set.
    if (params.get("sample") === "1") {
      setSampleModeActive(true);
      setActive(true);
    }
  }, [params]);

  useEffect(() => {
    const onChange = () => setActive(isSampleModeActive());
    window.addEventListener("sample-mode-changed", onChange);
    return () => window.removeEventListener("sample-mode-changed", onChange);
  }, []);

  return { isSampleMode: active };
}
