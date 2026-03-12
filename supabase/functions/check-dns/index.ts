const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

    // Use Google's public DNS-over-HTTPS API
    const [aResponse, cnameResponse] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`),
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`),
    ]);

    const aData = await aResponse.json();
    const cnameData = await cnameResponse.json();

    const aRecords = (aData.Answer || [])
      .filter((r: any) => r.type === 1)
      .map((r: any) => r.data);

    const cnameRecords = (cnameData.Answer || [])
      .filter((r: any) => r.type === 5)
      .map((r: any) => r.data?.replace(/\.$/, ""));

    const expectedCname = "teevents.lovable.app";
    const expectedIp = "185.158.133.1";

    const cnameCorrect = cnameRecords.some(
      (r: string) => r.toLowerCase() === expectedCname
    );
    const aCorrect = aRecords.some((r: string) => r === expectedIp);

    let status: "connected" | "misconfigured" | "not_found";
    let message: string;

    if (cnameCorrect || aCorrect) {
      status = "connected";
      message = "Your domain is correctly pointing to TeeVents! SSL will be provisioned automatically.";
    } else if (aRecords.length > 0 || cnameRecords.length > 0) {
      status = "misconfigured";
      const currentValue = cnameRecords.length > 0
        ? `CNAME → ${cnameRecords[0]}`
        : `A → ${aRecords[0]}`;
      message = `Your domain is resolving, but points to the wrong destination (${currentValue}). Please update your DNS records.`;
    } else {
      status = "not_found";
      message = "No DNS records found for this domain yet. If you just added them, please wait up to 48 hours for propagation.";
    }

    return new Response(
      JSON.stringify({ status, message, records: { a: aRecords, cname: cnameRecords } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to check DNS", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
