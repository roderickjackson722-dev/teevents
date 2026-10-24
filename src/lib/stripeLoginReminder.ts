import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const KEY = "teevents:stripe-login-reminder";
type LoginState = { sessionId: string; userId: string; pending: boolean };

// A session ID remains stable across token refreshes and tab-focus SIGNED_IN events.
function sessionId(session: Session): string | null {
  try {
    const payload = session.access_token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.session_id === "string" ? decoded.session_id : null;
  } catch { return null; }
}

export function nextLoginReminder(event: AuthChangeEvent, session: Session | null, previous: LoginState | null): LoginState | null {
  if (event === "SIGNED_OUT") return null;
  if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return previous;
  const id = sessionId(session);
  if (!id || previous?.sessionId === id) return previous;
  return { sessionId: id, userId: session.user.id, pending: event === "SIGNED_IN" };
}

function read(): LoginState | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function observeStripeLogin(event: AuthChangeEvent, session: Session | null) {
  const next = nextLoginReminder(event, session, read());
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch { /* A blocked storage context must not interfere with login. */ }
}

export function takeStripeLoginReminder(): boolean {
  const current = read();
  if (!current?.pending) return false;
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...current, pending: false })); } catch { return false; }
  return true;
}