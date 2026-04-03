import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { ArrowLeft, Globe, Clock, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const CustomDomain = () => {
  const [copied, setCopied] = useState(false);

  const copyValue = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <SEO title="Custom Domain Setup | TeeVents Help" description="Learn how to use your own domain name for your TeeVents tournament page." />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">How to Use Your Own Domain Name</h1>
            <p className="text-muted-foreground mt-1">Give your tournament a professional web address</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground">
          {/* Introduction */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <p className="text-foreground leading-relaxed">
                You can use your own web address (like <code className="bg-muted px-1.5 py-0.5 rounded text-xs">golf.myclub.com</code> or <code className="bg-muted px-1.5 py-0.5 rounded text-xs">tournament2026.myorg.org</code>) for your TeeVents tournament page instead of the default <code className="bg-muted px-1.5 py-0.5 rounded text-xs">teevents.golf/t/...</code> link. This looks more professional and is easier for your golfers to remember.
              </p>
            </CardContent>
          </Card>

          {/* Step 1 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
              Get a Domain (if you don't have one)
            </h2>
            <p className="mt-2">If you don't already own a domain, you can purchase one from any domain registrar:</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="https://www.namecheap.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Namecheap</a> — Affordable, easy to use
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="https://www.godaddy.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GoDaddy</a> — Popular, widely used
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cloudflare</a> — At-cost pricing, great DNS
              </li>
            </ul>
            <p className="mt-2 text-xs">💡 <strong>Tip:</strong> Subdomains like <code className="bg-muted px-1 py-0.5 rounded text-xs">golf.myclub.com</code> work great and don't require buying a new domain — just use a domain you already own.</p>
          </div>

          {/* Step 2 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
              Create a DNS Record
            </h2>
            <p className="mt-2">Log into your domain registrar's DNS settings and add the following record:</p>

            <Card className="mt-4 bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3">For Subdomains (Recommended)</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Type</p>
                    <code className="bg-background px-2 py-1 rounded border text-xs">CNAME</code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Host / Name</p>
                    <code className="bg-background px-2 py-1 rounded border text-xs">golf</code>
                    <p className="text-xs mt-1">(or your chosen subdomain)</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Points to / Value</p>
                    <div className="flex items-center gap-1">
                      <code className="bg-background px-2 py-1 rounded border text-xs">custom-domains.teevents.golf</code>
                      <button onClick={() => copyValue("custom-domains.teevents.golf")} className="p-1 hover:bg-muted rounded">
                        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-3 bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3">For Root Domains (e.g., myevent.com)</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Type</p>
                    <code className="bg-background px-2 py-1 rounded border text-xs">A</code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Host / Name</p>
                    <code className="bg-background px-2 py-1 rounded border text-xs">@</code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Points to / Value</p>
                    <div className="flex items-center gap-1">
                      <code className="bg-background px-2 py-1 rounded border text-xs">185.158.133.1</code>
                      <button onClick={() => copyValue("185.158.133.1")} className="p-1 hover:bg-muted rounded">
                        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs mt-2">⚠️ If you want <code className="bg-background px-1 rounded text-xs">www</code> to also work, add a second A record with Host = <code className="bg-background px-1 rounded text-xs">www</code> pointing to the same IP.</p>
              </CardContent>
            </Card>

            <p className="mt-2 text-xs">Set TTL to <strong>300</strong> or <strong>Automatic</strong>.</p>
          </div>

          {/* Step 3 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
              Wait for DNS Propagation
            </h2>
            <div className="flex items-start gap-3 mt-2 p-4 bg-secondary/10 rounded-lg border border-secondary/20">
              <Clock className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-medium text-sm">Usually takes a few minutes, but can take up to 48 hours.</p>
                <p className="text-xs mt-1">You can check your DNS status using <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dnschecker.org</a>.</p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
              Enter Your Domain in TeeVents
            </h2>
            <ol className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-0.5">a</span>
                <span>Go to your <strong>Tournament Dashboard → Site Builder</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-0.5">b</span>
                <span>Scroll to the <strong>Custom Domain</strong> section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-0.5">c</span>
                <span>Type your full domain (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">golf.myclub.com</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-0.5">d</span>
                <span>Click <strong>"Register / Retry SSL"</strong> to verify and provision your SSL certificate</span>
              </li>
            </ol>
          </div>

          {/* Step 5 */}
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</span>
              Test Your Domain
            </h2>
            <p className="mt-2">Visit your domain in a browser — you should see your tournament page with a secure (🔒) connection.</p>
            <p className="text-xs mt-1">SSL certificate provisioning typically takes 5-30 minutes after DNS verification.</p>
          </div>

          {/* Troubleshooting */}
          <div className="border-t border-border pt-8">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-secondary" />
              Troubleshooting
            </h2>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">"Domain not verified"</h3>
                  <ul className="mt-2 text-xs space-y-1">
                    <li>• Wait longer — DNS changes can take up to 48 hours to propagate</li>
                    <li>• Make sure you used <code className="bg-muted px-1 rounded">custom-domains.teevents.golf</code> (no <code className="bg-muted px-1 rounded">https://</code>)</li>
                    <li>• Subdomains MUST use CNAME, not A records</li>
                    <li>• Check for conflicting DNS records for the same host</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">SSL Certificate Errors</h3>
                  <ul className="mt-2 text-xs space-y-1">
                    <li>• SSL is provisioned automatically — wait 5-30 minutes after verification</li>
                    <li>• If using Cloudflare, enable the "Domain uses proxy" option in the advanced settings</li>
                    <li>• If you have CAA records, ensure they allow Let's Encrypt</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">"Domain already in use"</h3>
                  <ul className="mt-2 text-xs space-y-1">
                    <li>• Each domain can only be assigned to one tournament at a time</li>
                    <li>• Remove the domain from any other tournament first</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Still need help */}
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Still Need Help?</h3>
            <p className="text-sm mb-4">Contact us and we'll help you get set up.</p>
            <Button asChild variant="outline">
              <a href="mailto:info@teevents.golf">
                Email info@teevents.golf
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomDomain;
