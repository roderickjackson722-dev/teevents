/**
 * Install-time patch that wraps the shared Supabase client so that when
 * sample mode is active in the browser, all write operations (insert,
 * update, upsert, delete, storage uploads/removes, and RPC calls) are
 * intercepted and short-circuited with a friendly toast, instead of
 * hitting the database. Reads (`select`) pass through untouched so the
 * dashboard still shows the real organizer's data.
 *
 * The shared "sample-viewer" auth user has no write permissions in RLS,
 * so this is a UX guard — RLS is the real security boundary.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSampleModeActive } from "@/hooks/useSampleMode";

let installed = false;

// RPCs that must remain callable in sample mode (read-only or interest capture)
const RPC_ALLOWLIST = new Set<string>([
  "has_role",
  "bump_sample_view",
  "notify_sample_upgrade_interest",
  "record_org_login",
]);

function blockToast(what: string) {
  toast.info("Sample mode — changes aren't saved.", {
    description: `“${what}” is disabled until this tournament is converted to live.`,
    id: "sample-mode-block",
  });
}

function blockedResult(what: string) {
  blockToast(what);
  return Promise.resolve({
    data: null,
    error: { message: "Sample mode: writes are disabled", name: "SampleModeBlocked" } as any,
  });
}

export function installSampleSafeClient() {
  if (installed) return;
  installed = true;

  const c: any = supabase;

  // --- Wrap .from(table)
  const origFrom = c.from.bind(c);
  c.from = (table: string) => {
    const qb = origFrom(table);
    (["insert", "update", "upsert", "delete"] as const).forEach((m) => {
      if (typeof qb[m] !== "function") return;
      const orig = qb[m].bind(qb);
      qb[m] = (...args: any[]) => {
        if (isSampleModeActive()) return blockedResult(`${m} on ${table}`);
        return orig(...args);
      };
    });
    return qb;
  };

  // --- Wrap .rpc
  const origRpc = c.rpc.bind(c);
  c.rpc = (fn: string, args?: any, options?: any) => {
    if (isSampleModeActive() && !RPC_ALLOWLIST.has(fn)) {
      return blockedResult(`RPC ${fn}`);
    }
    return origRpc(fn, args, options);
  };

  // --- Wrap storage.from(bucket)
  const origStorageFrom = c.storage.from.bind(c.storage);
  c.storage.from = (bucket: string) => {
    const sb = origStorageFrom(bucket);
    (["upload", "remove", "move", "copy", "update", "createSignedUploadUrl"] as const).forEach((m) => {
      if (typeof (sb as any)[m] !== "function") return;
      const orig = (sb as any)[m].bind(sb);
      (sb as any)[m] = (...args: any[]) => {
        if (isSampleModeActive()) return blockedResult(`storage.${m} on ${bucket}`);
        return orig(...args);
      };
    });
    return sb;
  };

  // --- Wrap functions.invoke — block writes-through-functions except allowlisted read/lead-capture ones
  const FN_ALLOWLIST = new Set<string>([
    "sample-session-mint",
    "sample-tournament-snapshot",
    "notify-sample-upgrade",
  ]);
  const origInvoke = c.functions.invoke.bind(c.functions);
  c.functions.invoke = (fn: string, options?: any) => {
    if (isSampleModeActive() && !FN_ALLOWLIST.has(fn)) {
      return blockedResult(`function ${fn}`);
    }
    return origInvoke(fn, options);
  };
}
