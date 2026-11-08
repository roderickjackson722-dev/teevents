import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const openClientDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ sampleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const result = await context.supabase.rpc("ensure_client_demo", { _sample_id: data.sampleId });
    if (result.error) throw new Error(result.error.message);
    const value = z.object({ tournament_id: z.string().uuid(), organization_id: z.string().uuid(), slug: z.string() }).parse(result.data);
    return value;
  });

export const convertClientDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ sampleId: z.string().uuid(), organizationId: z.string().uuid(), notes: z.string().max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const result = await context.supabase.rpc("convert_client_demo", { _sample_id: data.sampleId, _organization_id: data.organizationId, _notes: data.notes });
    if (result.error) throw new Error(result.error.message);
    return z.object({ tournament_id: z.string().uuid(), organization_id: z.string().uuid(), slug: z.string() }).parse(result.data);
  });