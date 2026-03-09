import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface NonprofitSettingsProps {
  orgId: string;
}

export const NonprofitSettings = ({ orgId }: NonprofitSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [ein, setEin] = useState("");
  const [isNonprofit, setIsNonprofit] = useState(false);
  const [nonprofitName, setNonprofitName] = useState<string | null>(null);
  const [nonprofitVerified, setNonprofitVerified] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("is_nonprofit, ein, nonprofit_name, nonprofit_verified")
        .eq("id", orgId)
        .single() as any;

      if (data) {
        setIsNonprofit(data.is_nonprofit || false);
        setEin(data.ein || "");
        setNonprofitName(data.nonprofit_name || null);
        setNonprofitVerified(data.nonprofit_verified || false);
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

  const handleVerify = async () => {
    const cleanEin = ein.replace(/\D/g, "");
    if (cleanEin.length !== 9) {
      toast.error("Please enter a valid 9-digit EIN (XX-XXXXXXX)");
      return;
    }

    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("verify-ein", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { ein: cleanEin, organization_id: orgId },
      });

      if (error) throw error;

      setIsNonprofit(true);
      setNonprofitVerified(data.verified);
      setNonprofitName(data.nonprofit_name || null);
      setEin(data.ein);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
    setVerifying(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        is_nonprofit: false,
        ein: null,
        nonprofit_name: null,
        nonprofit_verified: false,
      } as any)
      .eq("id", orgId);

    if (error) {
      toast.error(error.message);
    } else {
      setIsNonprofit(false);
      setEin("");
      setNonprofitName(null);
      setNonprofitVerified(false);
      toast.success("Nonprofit status removed");
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
          <Badge variant={nonprofitVerified ? "default" : "secondary"} className="ml-auto">
            {nonprofitVerified ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Pending</>
            )}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Register your organization as a 501(c)(3) nonprofit to unlock tax-exempt features.
        Registrants will be able to cover processing fees, and all participants will receive
        tax-deductible donation receipts.
      </p>

      {isNonprofit ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                {nonprofitName && (
                  <p className="font-semibold text-foreground">{nonprofitName}</p>
                )}
                <p className="text-sm text-muted-foreground">EIN: {ein}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ✅ Zero platform fee on all transactions<br />
                  ✅ Donors can opt to cover processing fees<br />
                  ✅ Tax-deductible receipts sent automatically
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing}>
            {removing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Remove Nonprofit Status
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label>EIN (Employer Identification Number)</Label>
            <Input
              value={ein}
              onChange={(e) => setEin(formatEin(e.target.value))}
              placeholder="XX-XXXXXXX"
              maxLength={10}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your 9-digit IRS Employer Identification Number. We'll verify this against the IRS database.
            </p>
          </div>
          <Button onClick={handleVerify} disabled={verifying || ein.replace(/\D/g, "").length !== 9}>
            {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verify & Enable Nonprofit
          </Button>
        </div>
      )}
    </div>
  );
};
