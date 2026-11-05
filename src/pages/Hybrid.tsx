import Layout from "@/components/Layout";
import FullServiceManagement from "@/components/marketing/FullServiceManagement";
import FullServiceQuoteDialog from "@/components/marketing/FullServiceQuoteDialog";
import { MANAGED_TAG, MANAGED_DEFINITION, FULL_SERVICE_PRICE } from "@/lib/programTypes";

export default function Hybrid() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl space-y-5 px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Full Service Management</h1>
        <p className="text-xs font-bold text-secondary">{MANAGED_TAG}</p>
        <p className="text-xl font-semibold">{FULL_SERVICE_PRICE}</p>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/85">{MANAGED_DEFINITION}</p>
        <FullServiceQuoteDialog />
        <p className="text-sm text-primary-foreground/75">Hybrid Managed is now Full Service Management.</p>
      </div>
    </section>
    <section id="full-service-management" className="container mx-auto max-w-3xl px-4 py-12 md:py-16"><FullServiceManagement /></section>
  </Layout>;
}
