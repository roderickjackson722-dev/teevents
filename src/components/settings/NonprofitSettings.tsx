import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle2, Loader2, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

interface NonprofitSettingsProps {
  orgId: string;
}

/** Where organizers edit the tax-deductible donation receipt email. */
const RECEIPT_TEMPLATE_URL = "/dashboard/email-templates?template=receipt&receipt_type=tax_deductible";

export const NonprofitSettings = ({ orgId }: NonprofitSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [ein, setEin] = useState("");
  const [isNonprofit, setIsNonprofit] = useState(false);
  const [nonprofitName, setNonprofitName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("is_nonprofit, ein, nonprofit_name, name, mailing_address")
        .eq("id", orgId)
        .single() as any;

      if (data) {
        setIsNonprofit(data.is_nonprofit || false);
        setEin(data.ein || "");
        setNonprofitName(data.nonprofit_name || data.name || "");
        setMailingAddress(data.mailing_address || "");
      }
      setLoading(false);
    };
    fetchStatus();
  }, [orgId]);

  const formatEin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length > 2) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return digits;
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        is_nonprofit: true,
        ein: ein.trim() || null,
        nonprofit_name: nonprofitName.trim() || null,
        mailing_address: mailingAddress.trim() || null,
      } as any)
      .eq("id", orgId);

    if (error) {
      toast.error(error.message);
    } else {
      setIsNonprofit(true);
      toast.success("Nonprofit details saved");
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ is_nonprofit: false } as any)
      .eq("id", orgId);

    if (error) {
      toast.error(error.message);
    } else {
      setIsNonprofit(false);
      toast.success("Nonprofit status turned off");
    }
    setRemoving(false);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading nonprofit settings...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Heart className="h-6 w-6 text-destructive" />
        <h2 className="text-lg font-display font-bold text-foreground">
          Nonprofit / 501(c)(3) Status
        </h2>
        {isNonprofit && (
          <Badge className="ml-auto">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Enabled
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Turn this on if your organization is a 501(c)(3). Registrants and sponsors will be able to
        cover processing fees, and you can send tax-deductible donation receipts to your donors.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Organization name on receipts</Label>
            <Input
              value={nonprofitName}
              onChange={(e) => setNonprofitName(e.target.value)}
              placeholder="Your Foundation, Inc."
            />
          </div>
          <div>
            <Label>EIN (optional)</Label>
            <Input
              value={ein}
              onChange={(e) => setEin(formatEin(e.target.value))}
              placeholder="XX-XXXXXXX"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown on your donation receipts. No verification needed.
            </p>
          </div>
        </div>

        <div>
          <Label>Mailing address on receipts</Label>
          <Input
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            placeholder="123 Main St, City, ST 00000"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <ShieldCheck className="h-4 w-4 mr-2" />
            {isNonprofit ? "Save Nonprofit Details" : "Enable Nonprofit Features"}
          </Button>
          {isNonprofit && (
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing}>
              {removing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Turn Off Nonprofit Status
            </Button>
          )}
        </div>

        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Tax-Deductible Donation Receipt</p>
              <p className="text-sm text-muted-foreground mt-1">
                The receipt your donors get is a fully editable email template. Change the wording,
                colors, and logo, preview it, then send it to a donor from your registrant list or to
                any email address — or copy and download it to send yourself.
              </p>
              <Button asChild size="sm" className="mt-3">
                <a href={RECEIPT_TEMPLATE_URL}>View &amp; Edit Donation Receipt</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
