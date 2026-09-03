import { useNavigate } from "react-router-dom";
import { Building2, CalendarRange, FileSpreadsheet, FileText, Lock, Receipt, Volleyball } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Private "RFP Features" launcher, rendered only inside the admin dashboard.
 * Not linked from any organizer or public navigation.
 */
const ITEMS = [
  { to: "/admin/sports", label: "Sports Management", desc: "Add/edit sport types and settings.", Icon: Volleyball },
  { to: "/admin/seasons", label: "Season Management", desc: "Create seasons, add teams, view standings.", Icon: CalendarRange },
  { to: "/admin/facilities", label: "Facility Management", desc: "Add facilities, schedule games.", Icon: Building2 },
  { to: "/admin/financial-reports", label: "Financial Reports", desc: "Generate GAAP/GASB reports.", Icon: FileSpreadsheet },
  { to: "/admin/invoices", label: "Invoice", desc: "Create, edit and export RFP sample invoices.", Icon: Receipt },
  { to: "/admin/transition-plan", label: "Transition Plan", desc: "Data export and knowledge transfer plan.", Icon: FileText },
];

export default function RfpFeaturesPanel() {
  const navigate = useNavigate();
  return (
    <Card className="mb-6 p-4 border-dashed">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">RFP Features (Admin Only)</h2>
        <span className="text-xs text-muted-foreground">Private — hidden from organizers and the public</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ to, label, desc, Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="text-left rounded-lg border border-border bg-card p-3 hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-foreground text-sm">
              <Icon className="h-4 w-4 text-primary" /> {label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
