import { Link } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import PayoutSettings from "@/pages/dashboard/PayoutSettings";
import { Button } from "@/components/ui/button";
import { FileBarChart, FileText } from "lucide-react";

/** Enterprise Payments: the existing payout account and payout view inside the Enterprise shell (no behavior changes). */
export default function EnterprisePayments() {
  return (
    <EnterpriseLayout
      title="Payments"
      description="Your payout account, balance and payouts. Reports and invoices live in Operations."
      crumbs={[{ label: "Operations", to: "/enterprise/operations" }, { label: "Payments" }]}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link to="/enterprise/operations?tab=reports"><FileBarChart className="mr-1.5 h-4 w-4" />Reports &amp; POS</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/enterprise/operations?tab=invoices"><FileText className="mr-1.5 h-4 w-4" />Invoices</Link></Button>
      </div>
      <PayoutSettings />
    </EnterpriseLayout>
  );
}
