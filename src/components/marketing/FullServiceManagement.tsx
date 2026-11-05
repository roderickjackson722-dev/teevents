import { FULL_SERVICE_NAME, FULL_SERVICE_PRICE, FULL_SERVICE_SCOPE, FULL_SERVICE_GROUP, FULL_SERVICE_LIMITS, MANAGED_TAG, MANAGED_DEFINITION, ON_SITE_HEADING, ON_SITE_BULLETS } from "@/lib/programTypes";
import FullServiceQuoteDialog from "./FullServiceQuoteDialog";

export default function FullServiceManagement({ showTitle = true }: { showTitle?: boolean }) {
  return <div className="space-y-5 text-foreground">
    {showTitle && <h2 className="font-display text-3xl font-bold text-primary">{FULL_SERVICE_NAME}</h2>}
    <p className="text-xs font-bold text-primary">{MANAGED_TAG}</p>
    <p className="text-xl font-semibold">{FULL_SERVICE_PRICE}</p>
    <p className="leading-relaxed text-muted-foreground">{MANAGED_DEFINITION}</p>
    <div><h3 className="mb-2 font-semibold">What we manage</h3><p className="leading-relaxed text-muted-foreground">{FULL_SERVICE_SCOPE}</p></div>
    <div><h3 className="mb-3 font-semibold">{ON_SITE_HEADING}</h3><ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">{ON_SITE_BULLETS.map(bullet => <li key={bullet}>{bullet}</li>)}</ul></div>
    <div><h3 className="mb-2 font-semibold">What your group handles</h3><p className="leading-relaxed text-muted-foreground">{FULL_SERVICE_GROUP}</p></div>
    <div><h3 className="mb-2 font-semibold">Limits</h3><p className="leading-relaxed text-muted-foreground">{FULL_SERVICE_LIMITS}</p></div>
    <FullServiceQuoteDialog />
  </div>;
}