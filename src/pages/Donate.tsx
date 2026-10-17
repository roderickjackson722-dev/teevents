import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const donationUrl = "https://www.zeffy.com/en-US/donation-form/d71cb3fd-88ac-4b77-8fdc-138d28d1cf55";
const formPath = "/embed/donation-form/d71cb3fd-88ac-4b77-8fdc-138d28d1cf55";

export default function Donate() {
  const embedRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const embed = embedRef.current;
    if (!embed) return;

    const script = document.createElement("script");
    script.src = "https://www.zeffy.com/embed/v2/zeffy-embed.js";
    script.async = true;
    script.onerror = () => setShowFallback(true);
    embed.after(script);

    return () => {
      script.onerror = null;
      script.remove();
      embed.replaceChildren();
    };
  }, []);

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
          <div className="mt-8 w-full">
            <div ref={embedRef} data-zeffy-embed data-form-url={formPath} />
            <div data-zeffy-embed-fallback hidden={!showFallback}>
              {showFallback && (
                <div className="relative h-[450px] w-full overflow-hidden">
                  <iframe
                    src={`https://www.zeffy.com${formPath}`}
                    data-zeffy-embed-src={`https://www.zeffy.com${formPath}`}
                    title="Donation form powered by Zeffy"
                    className="absolute inset-0 h-full w-full border-0"
                    allow="payment"
                    allowTransparency
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}