import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ruler, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  runFitCheck,
  printDialogHint,
  browserLabel,
  type FitResult,
  type PrintTarget,
  type PrintFitOptions,
} from "./printLayout";

interface Props {
  /** Built lazily so we only serialize the printable when the check runs */
  getBodyHtml: () => string;
  target: PrintTarget;
  fitOptions?: PrintFitOptions;
}

/**
 * On-demand print/PDF fit check: renders the printable off-screen with the exact
 * print CSS, measures the page box and content box, and reports whether the
 * output will land on the target page size in the current browser.
 */
export default function PrintFitCheck({ getBodyHtml, target, fitOptions }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FitResult | null>(null);
  const browser = browserLabel();

  const run = async () => {
    setRunning(true);
    try {
      const res = await runFitCheck(getBodyHtml(), target, fitOptions);
      setResult(res);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={run} disabled={running} className="gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
        Check print fit
      </Button>

      {result && (
        <div
          className={`rounded-lg border p-3 text-xs space-y-1.5 ${
            result.ok ? "border-primary/40 bg-primary/5" : "border-destructive/50 bg-destructive/5"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            {result.ok
              ? `${result.target.label} fits the ${sizeLabel(result.target)} page`
              : `${result.target.label} layout needs attention`}
          </div>
          <ul className="text-muted-foreground space-y-0.5">
            <li>
              Page box measured: {result.measuredHeightIn}in H × {result.measuredWidthIn}in W (target{" "}
              {sizeLabel(result.target)})
            </li>

            <li>
              Content on paper: {result.contentWidthIn}in × {result.contentHeightIn}in at {Math.round(result.scale * 100)}% scale,{" "}
              {result.marginIn}in margins
            </li>
            <li>Pages: {result.pages}</li>
          </ul>
          {result.issues.length > 0 && (
            <ul className="list-disc pl-4 text-destructive space-y-0.5">
              {result.issues.map((i) => (
                <li key={i.code}>{i.message}</li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">{printDialogHint(result.target, browser)}</p>
        </div>
      )}
    </div>
  );
}
