// HMAC signatures for public email links (click tracking, unsubscribe).
async function key() {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return await crypto.subtle.importKey("raw", new TextEncoder().encode("link-sig:" + secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
export async function signLink(value: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
export async function verifyLink(value: string, sig: string | null): Promise<boolean> {
  if (!sig) return false;
  return (await signLink(value)) === sig;
}
