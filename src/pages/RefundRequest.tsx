import { useParams, useSearchParams } from "react-router-dom";
import RefundRequestForm from "@/components/RefundRequestForm";
import { SEO } from "@/components/SEO";

export default function RefundRequest() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";

  if (!tournamentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="bg-background rounded-xl border p-8 shadow-sm max-w-md w-full text-center">
          <h1 className="text-lg font-bold text-foreground mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">This refund request link is invalid. Please use the link from your registration confirmation email.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Request a Refund | TeeVents" description="Submit a refund request for your tournament registration." noIndex />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="bg-background rounded-xl border p-6 sm:p-8 shadow-sm max-w-md w-full">
          <RefundRequestForm
            tournamentId={tournamentId}
            primaryColor="#1a5c38"
            secondaryColor="#1a5c38"
            prefillEmail={prefillEmail}
          />
        </div>
      </div>
    </>
  );
}
