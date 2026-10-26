import { Link, useLocation } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import OrganizationInfo from "@/pages/dashboard/OrganizationInfo";
import SiteBuilder from "@/pages/dashboard/SiteBuilder";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { enterpriseLink } from "@/lib/enterpriseNavigation";

export default function EnterpriseSettings({ view }: { view: "organization" | "web-address" }) {
  const { search } = useLocation();
  const { event, loading } = useEnterpriseEvent();
  const title = view === "organization" ? "Organization details" : "Web address & branding";
  return (
    <EnterpriseLayout title={title} crumbs={[{ label: "Admin Portal", to: "/enterprise/admin" }, { label: title }]}>
      <Button asChild variant="outline" size="sm" className="mb-5">
        <Link to={enterpriseLink("/enterprise/admin", search)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Enterprise Admin</Link>
      </Button>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        event ? view === "organization" ? <OrganizationInfo key={event.id} enterpriseEventId={event.id} /> : <SiteBuilder key={event.id} enterpriseEventId={event.id} /> :
        <p className="text-muted-foreground">No Enterprise event available.</p>}
    </EnterpriseLayout>
  );
}