import { ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const donationUrl = "https://www.zeffy.com/en-US/donation-form/d71cb3fd-88ac-4b77-8fdc-138d28d1cf55";

export default function Donate() {
  return (
    <Layout>
      <section className="bg-background px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-center font-display text-4xl font-bold text-primary sm:text-5xl">Donate</h1>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <a href={donationUrl} target="_blank" rel="noopener noreferrer">Open in Zeffy <ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
          <iframe
            src="https://www.zeffy.com/embed/donation-form/d71cb3fd-88ac-4b77-8fdc-138d28d1cf55"
            title="Zeffy donation form"
            className="mt-8 h-[1100px] w-full border-0 sm:h-[950px]"
            allow="payment"
          />
        </div>
      </section>
    </Layout>
  );
}