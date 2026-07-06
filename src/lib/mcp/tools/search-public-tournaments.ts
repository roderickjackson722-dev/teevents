import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Public search uses the anon key (no user token needed).
function anonClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_public_tournaments",
  title: "Search public tournaments",
  description:
    "Search TeeVents tournaments that have opted into public discovery. Returns id, title, date, course, and public slug.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search text matched against tournament title or course."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit }) => {
    const like = `%${query}%`;
    const { data, error } = await anonClient()
      .from("tournaments")
      .select("id, title, date, course_name, custom_slug")
      .eq("show_in_public_search", true)
      .eq("site_published", true)
      .or(`title.ilike.${like},course_name.ilike.${like}`)
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
