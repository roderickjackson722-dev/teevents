import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = { fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response };
let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) serverEntryPromise = import("@tanstack/react-start/server-entry").then((m) => (m.default ?? m) as ServerEntry);
  return serverEntryPromise;
}

async function normalizeResponse(response: Response): Promise<Response> {
  if (response.status < 500 || !(response.headers.get("content-type") ?? "").includes("application/json")) return response;
  const body = await response.clone().text();
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    if (payload.unhandled !== true || payload.message !== "HTTPError") return response;
  } catch { return response; }
  console.error(consumeLastCapturedError() ?? new Error(`SSR error: ${body}`));
  return new Response(renderErrorPage(), { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
}

export default { async fetch(request: Request, env: unknown, ctx: unknown) {
  try { return await normalizeResponse(await (await getServerEntry()).fetch(request, env, ctx)); }
  catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
  }
} };