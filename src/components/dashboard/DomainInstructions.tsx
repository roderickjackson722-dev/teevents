import { useState } from "react";
import { Globe, Copy, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CNAME_TARGET = "custom-domains.teevents.golf";
const A_RECORD_IP = "185.158.133.1";

interface DnsRow {
  type: string;
  name: string;
  value: string;
  ttl?: string;
}

function DnsTable({ rows }: { rows: DnsRow[] }) {
  const { toast } = useToast();
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-semibold text-foreground text-xs uppercase tracking-wide">Type</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground text-xs uppercase tracking-wide">Name / Host</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground text-xs uppercase tracking-wide">Value / Points To</th>
            <th className="text-left py-2 px-3 font-semibold text-foreground text-xs uppercase tracking-wide">TTL</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              <td className="py-2 px-3 font-semibold">{r.type}</td>
              <td className="py-2 px-3">{r.name}</td>
              <td className="py-2 px-3 break-all">{r.value}</td>
              <td className="py-2 px-3 text-muted-foreground">{r.ttl ?? "Auto"}</td>
              <td className="py-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(r.value);
                    toast({ title: "Copied", description: `${r.value} copied to clipboard.` });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {n}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-sm text-muted-foreground mt-0.5 space-y-1">{children}</div>
      </div>
    </li>
  );
}

export function DomainInstructions({ currentDomain }: { currentDomain?: string | null }) {
  const [tab, setTab] = useState("subdomain");

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-display font-bold text-foreground">Custom Domain Setup Guide</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the option that matches the domain you want to connect. Each tab gives you the exact records to add at your registrar.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="p-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="subdomain" className="text-xs">Subdomain</TabsTrigger>
          <TabsTrigger value="root" className="text-xs">Root Domain</TabsTrigger>
          <TabsTrigger value="www" className="text-xs">WWW</TabsTrigger>
          <TabsTrigger value="registrar" className="text-xs">Registrar Tips</TabsTrigger>
        </TabsList>

        {/* SUBDOMAIN */}
        <TabsContent value="subdomain" className="mt-4 space-y-4">
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm text-foreground">
              <strong>Recommended for most organizers.</strong> Use a subdomain like{" "}
              <span className="font-mono">golf.yourwebsite.com</span> or{" "}
              <span className="font-mono">tournament.yourcharity.org</span>. Your main site stays completely untouched.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">DNS Record to add</p>
            <DnsTable
              rows={[
                { type: "CNAME", name: "golf  (or your chosen prefix)", value: CNAME_TARGET },
              ]}
            />
          </div>

          <ol className="space-y-3">
            <Step n={1} title="Log in to your domain registrar">
              <p>This is where you bought your domain (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.).</p>
            </Step>
            <Step n={2} title="Open DNS Management">
              <p>Look for "DNS", "DNS Management", "Advanced DNS", or "Zone Editor".</p>
            </Step>
            <Step n={3} title="Add a CNAME record">
              <p>
                <strong>Type:</strong> CNAME &nbsp;•&nbsp; <strong>Name/Host:</strong> the prefix only (e.g. <span className="font-mono">golf</span>, NOT <span className="font-mono">golf.yourwebsite.com</span>)
                &nbsp;•&nbsp; <strong>Value:</strong> <span className="font-mono">{CNAME_TARGET}</span>
              </p>
            </Step>
            <Step n={4} title="Enter your full subdomain below and save">
              <p>Type <span className="font-mono">golf.yourwebsite.com</span> in the Domain Name field below, then click Save. We register it with our SSL provider automatically.</p>
            </Step>
            <Step n={5} title="Wait 15 min – 2 hours">
              <p>DNS propagation + SSL provisioning. Use the status checker below to verify.</p>
            </Step>
          </ol>

          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              Do <strong>not</strong> use an A record for a subdomain. Subdomains must use CNAME.
            </p>
          </div>
        </TabsContent>

        {/* ROOT */}
        <TabsContent value="root" className="mt-4 space-y-4">
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm text-foreground">
              Use this if you bought a dedicated domain just for your tournament (e.g.{" "}
              <span className="font-mono">mycharitygolf.com</span>) and want it to point entirely to TeeVents.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">DNS Records to add</p>
            <DnsTable
              rows={[
                { type: "A", name: "@", value: A_RECORD_IP },
                { type: "CNAME", name: "www", value: CNAME_TARGET },
              ]}
            />
            <p className="text-xs text-muted-foreground mt-2">
              The <span className="font-mono">@</span> name means the root domain itself. Add the <span className="font-mono">www</span> CNAME too so both versions work.
            </p>
          </div>

          <ol className="space-y-3">
            <Step n={1} title="Log in to your domain registrar">
              <p>This is where the domain is registered.</p>
            </Step>
            <Step n={2} title="Remove any existing A records for @">
              <p>If the domain previously pointed to another website, delete those old A records first to avoid conflicts.</p>
            </Step>
            <Step n={3} title="Add the A record">
              <p><strong>Type:</strong> A &nbsp;•&nbsp; <strong>Name:</strong> <span className="font-mono">@</span> &nbsp;•&nbsp; <strong>Value:</strong> <span className="font-mono">{A_RECORD_IP}</span></p>
            </Step>
            <Step n={4} title="Add the www CNAME">
              <p><strong>Type:</strong> CNAME &nbsp;•&nbsp; <strong>Name:</strong> <span className="font-mono">www</span> &nbsp;•&nbsp; <strong>Value:</strong> <span className="font-mono">{CNAME_TARGET}</span></p>
            </Step>
            <Step n={5} title="Enter your domain below and save">
              <p>Type <span className="font-mono">yourdomain.com</span> in the Domain Name field below. We auto-register both the apex and the www version.</p>
            </Step>
          </ol>
        </TabsContent>

        {/* WWW */}
        <TabsContent value="www" className="mt-4 space-y-4">
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm text-foreground">
              The <span className="font-mono">www</span> version of a domain is technically a subdomain, so it always uses a CNAME.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">DNS Record to add</p>
            <DnsTable rows={[{ type: "CNAME", name: "www", value: CNAME_TARGET }]} />
          </div>

          <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              When you connect a root domain in the field below, we automatically register both <span className="font-mono">yourdomain.com</span> and <span className="font-mono">www.yourdomain.com</span> — so you only need to add the records, you don't need to enter <span className="font-mono">www.</span> separately.
            </p>
          </div>
        </TabsContent>

        {/* REGISTRAR */}
        <TabsContent value="registrar" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Quick pointers for the most common registrars. The DNS records themselves are the same — it's just where you click.
          </p>

          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">GoDaddy</p>
              <p className="text-xs text-muted-foreground mt-1">
                My Products → DNS → <strong>delete any default "Parked" A records</strong> for @ before adding ours. Use "Add New Record".
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">Namecheap</p>
              <p className="text-xs text-muted-foreground mt-1">
                Domain List → Manage → Advanced DNS. Remove the default <em>Parking Page</em> URL Redirect record before adding your records.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">Cloudflare</p>
              <p className="text-xs text-muted-foreground mt-1">
                DNS → Records. Set Proxy status to <strong>DNS only (grey cloud)</strong> for both records — we handle the proxy on our side.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">Google Domains / Squarespace Domains</p>
              <p className="text-xs text-muted-foreground mt-1">
                DNS → Custom records. Add as a "Custom resource record".
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-foreground">School / University IT department</p>
              <p className="text-xs text-muted-foreground mt-1">
                Send your IT contact this exact instruction: <em>"Please add a CNAME record for <strong>golf</strong> (or chosen prefix) pointing to <span className="font-mono">{CNAME_TARGET}</span>."</em>
              </p>
            </div>
          </div>

          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              You cannot use a URL <strong>path</strong> like <span className="font-mono">yourwebsite.com/golf</span> as a custom domain — DNS works at the domain level, not the page level. Use a subdomain instead.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">SSL is automatic.</strong> Once your DNS resolves to us, we issue a free SSL certificate within 5–30 minutes. You don't need to do anything else.
          {currentDomain && (
            <> Your current domain: <span className="font-mono text-foreground">{currentDomain}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
