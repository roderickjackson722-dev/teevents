import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Copy, Download, Mail, Facebook, Twitter, Linkedin, MessageCircle } from "lucide-react";

export default function LeagueShareTab({ league }: { league: any }) {
  const path = `/league/${league.league_slug}`;
  // share.teevents.golf renders this league's own title/description/logo for
  // iMessage, Facebook, LinkedIn etc., then forwards visitors to the real page.
  const url = sharePreviewUrl(path);
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${league.league_slug}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareLinks = socialShareLinks(path, `Join ${league.league_name}`);


  const sendInvites = async () => {
    const list = emails.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /@/.test(s));
    if (list.length === 0) return toast({ title: "Add at least one valid email", variant: "destructive" });
    setSending(true);
    const { error } = await (supabase as any).functions.invoke("send-league-invites", {
      body: { league_id: league.id, emails: list },
    });
    setSending(false);
    if (error) return toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    toast({ title: `Invites sent to ${list.length} recipient(s)` });
    setEmails("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Share Your League</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>League Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={url} readOnly />
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
            </div>
          </div>

          <div>
            <Label>QR Code</Label>
            <div className="flex items-start gap-4 mt-2">
              <div ref={qrRef} className="p-3 bg-white rounded border inline-block">
                <QRCodeCanvas value={url} size={160} />
              </div>
              <Button variant="outline" onClick={downloadQR}><Download className="h-4 w-4 mr-2" /> Download QR</Button>
            </div>
          </div>

          <div>
            <Label>Share on</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="outline" asChild><a href={shareLinks.facebook} target="_blank" rel="noreferrer"><Facebook className="h-4 w-4 mr-2" /> Facebook</a></Button>
              <Button variant="outline" asChild><a href={shareLinks.twitter} target="_blank" rel="noreferrer"><Twitter className="h-4 w-4 mr-2" /> Twitter</a></Button>
              <Button variant="outline" asChild><a href={shareLinks.linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4 mr-2" /> LinkedIn</a></Button>
              <Button variant="outline" asChild><a href={shareLinks.email}><Mail className="h-4 w-4 mr-2" /> Email</a></Button>
              <Button variant="outline" asChild><a href={shareLinks.whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-2" /> WhatsApp</a></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invite Players via Email</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} placeholder="player1@example.com, player2@example.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
          <Button onClick={sendInvites} disabled={sending}>{sending ? "Sending…" : "Send Invites"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
