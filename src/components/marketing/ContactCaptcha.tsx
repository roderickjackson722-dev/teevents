import { useEffect, useRef, useState } from "react";
import { getContactCaptcha } from "@/lib/contact.functions";

type CaptchaApi = { render: (container: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void };
const api = () => (window as unknown as { hcaptcha?: CaptchaApi }).hcaptcha;

export default function ContactCaptcha({ onToken, resetKey }: { onToken: (token: string) => void; resetKey: number }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  callback.current = onToken;
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let attempts = 0;
    getContactCaptcha().then(({ siteKey }) => {
      if (disposed) return;
      if (!siteKey) { setError("CAPTCHA is unavailable. Please email info@teevents.golf instead."); return; }
      const render = () => {
        const captcha = api();
        if (disposed || !captcha || !container.current || widget.current !== null) return false;
        widget.current = captcha.render(container.current, { sitekey: siteKey, callback: (token: string) => callback.current(token), "expired-callback": () => callback.current(""), "error-callback": () => { callback.current(""); setError("CAPTCHA could not load. Please refresh and try again."); } });
        setReady(true);
        return true;
      };
      if (render()) return;
      if (!document.querySelector('script[src*="js.hcaptcha.com/1/api.js"]')) {
        const script = document.createElement("script");
        script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
        script.async = true;
        script.onerror = () => { if (!disposed) setError("CAPTCHA could not load. Please refresh and try again."); };
        document.head.appendChild(script);
      }
      timer = setInterval(() => {
        attempts += 1;
        if (render() || attempts > 60) {
          clearInterval(timer);
          if (attempts > 60 && !disposed) setError("CAPTCHA could not load. Please refresh and try again.");
        }
      }, 250);
    }).catch(() => { if (!disposed) setError("CAPTCHA is unavailable. Please email info@teevents.golf instead."); });
    return () => { disposed = true; clearInterval(timer); if (widget.current !== null) api()?.remove(widget.current); widget.current = null; };
  }, []);
  useEffect(() => { if (widget.current !== null) api()?.reset(widget.current); callback.current(""); }, [resetKey]);
  return <div className="min-h-[80px]"><div ref={container} />{!ready && !error && <p className="text-sm text-muted-foreground">Loading CAPTCHA...</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}