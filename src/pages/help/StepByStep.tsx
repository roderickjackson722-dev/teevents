import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { STEP_BY_STEP_HELP, type HelpArticle } from "@/lib/stepByStepHelp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, Printer, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const StepByStep = () => {
  const [selected, setSelected] = useState<HelpArticle | null>(null);

  const handleCopyLink = (key: string) => {
    const url = `${window.location.origin}/help/step-by-step#${key}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Article link copied to clipboard." });
  };

  const handlePrint = () => window.print();

  return (
    <Layout>
      <SEO
        title="Step-by-Step Instructions | TeeVents Help"
        description="Detailed walkthroughs for every menu item in the TeeVents tournament organizer dashboard."
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link
          to="/help"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">
          Step-by-Step Instructions
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          Detailed walkthroughs for every menu item in your organizer dashboard. Click any item to open instructions.
        </p>

        <div className="space-y-10">
          {STEP_BY_STEP_HELP.map((section) => (
            <section key={section.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {section.label}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {section.articles.map((article) => (
                  <button
                    key={article.key}
                    onClick={() => setSelected(article)}
                    className="group text-left p-4 bg-card rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {article.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {article.description}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">{selected.title}</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground pt-1">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Step-by-step</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/90">
                    {selected.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>

                {selected.tips && selected.tips.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Tips & best practices</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
                      {selected.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.commonIssues && selected.commonIssues.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Common issues</h3>
                    <ul className="space-y-2 text-sm text-foreground/90">
                      {selected.commonIssues.map((c, i) => (
                        <li key={i}>
                          <span className="font-medium">"{c.issue}"</span> — {c.solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(selected.key)}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" /> Copy Link
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StepByStep;
