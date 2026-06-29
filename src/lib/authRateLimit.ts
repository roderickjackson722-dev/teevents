import { supabase } from "@/integrations/supabase/client";

export type AuthRateAction = "login" | "signup" | "password_reset";

export interface AuthRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  message?: string;
}

/**
 * Server-side rate limit check for auth endpoints.
 * Limits 10 attempts per hour per IP per action.
 * Fails open if the backend is unreachable so we never lock users out due to platform issues.
 */
export async function checkAuthRateLimit(action: AuthRateAction): Promise<AuthRateLimitResult> {
  try {
    const { data, error } = await supabase.functions.invoke("check-auth-rate-limit", {
      body: { action },
    });
    if (error) {
      // Non-2xx (e.g. 429) lands here; try to read the structured error
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.allowed === false) {
            const minutes = body.retry_after ? Math.ceil(body.retry_after / 60) : 60;
            return {
              allowed: false,
              retryAfter: body.retry_after,
              message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            };
          }
        } catch { /* ignore */ }
      }
      return { allowed: true };
    }
    if (data && data.allowed === false) {
      const minutes = data.retry_after ? Math.ceil(data.retry_after / 60) : 60;
      return {
        allowed: false,
        retryAfter: data.retry_after,
        message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
