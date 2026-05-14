import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, ImageUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const UploadingImages = () => (
  <Layout>
    <SEO
      title="Troubleshooting Image Uploads | TeeVents Help"
      description='Fix common image upload issues including the Windows "Protected Storage is empty" file picker message.'
    />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Help Center
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          <ImageUp className="h-6 w-6" />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          Troubleshooting Image Uploads
        </h1>
      </div>
      <p className="text-lg text-muted-foreground mb-10">
        Having trouble uploading a logo, sponsor image, or photo? Most upload issues come from your
        browser or operating system — not TeeVents. Here's how to fix the most common ones.
      </p>

      <section className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-display font-bold text-foreground">
            "Protected Storage is empty"
          </h2>
        </div>
        <p className="text-foreground mb-4">
          Good news — that's not a TeeVents error. <strong>"Protected Storage is empty"</strong> is a
          message from the Windows file picker dialog (the OS-level "Open" window your browser
          launches when you click <em>Upload Logo</em>). It's showing because the file picker opened
          to a Windows system folder called <strong>Protected Storage</strong>, which is restricted
          or empty — common on corporate / managed laptops.
        </p>

        <h3 className="font-semibold text-foreground mt-6 mb-2">How to fix it</h3>
        <p className="text-muted-foreground mb-2">In that "Open…" dialog window:</p>
        <ol className="list-decimal list-inside space-y-1 text-foreground mb-4">
          <li>Look at the left sidebar of the file picker</li>
          <li>Click <strong>Desktop</strong>, <strong>Downloads</strong>, <strong>Pictures</strong>, or <strong>This PC</strong></li>
          <li>Navigate to where your image file is saved</li>
          <li>Select the image (PNG, JPG) → click <strong>Open</strong></li>
        </ol>
        <p className="text-muted-foreground">
          Alternatively, type the full file path directly into the <strong>File name</strong> box at
          the bottom (e.g.{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
            C:\Users\[name]\Downloads\my-logo.png
          </code>
          ) and click <strong>Open</strong>.
        </p>

        <h3 className="font-semibold text-foreground mt-6 mb-2">Why this happens</h3>
        <p className="text-muted-foreground">
          Corporate Windows machines often have Group Policy that forces file pickers to open in
          restricted locations like Protected Storage by default. It's a Windows / IT policy
          setting — nothing TeeVents can control, because the browser hands off file selection
          entirely to the operating system.
        </p>
      </section>

      <section className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">
            If you keep hitting the issue
          </h2>
        </div>
        <ul className="list-disc list-inside space-y-2 text-foreground">
          <li><strong>Save the image to your Desktop first</strong> — easiest workaround.</li>
          <li><strong>Try a different browser</strong> (Chrome vs. Edge) — the default folder may differ.</li>
          <li>
            <strong>Drag and drop</strong> the image file directly onto the upload area instead of
            clicking Browse. This bypasses the Windows file picker entirely.
          </li>
          <li>Ask your IT team to allow standard file picker locations if the issue persists.</li>
        </ul>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xl font-display font-bold text-foreground mb-3">
          Other upload tips
        </h2>
        <ul className="list-disc list-inside space-y-2 text-foreground">
          <li>Supported formats: <strong>PNG, JPG, JPEG, WEBP</strong>.</li>
          <li>Keep files under <strong>10 MB</strong> for fastest upload.</li>
          <li>For logos, use a <strong>transparent PNG</strong> when possible for the best look.</li>
          <li>HEIC photos from iPhone may need to be converted to JPG first.</li>
        </ul>
      </section>

      <div className="mt-10 text-sm text-muted-foreground">
        Still stuck? <Link to="/contact" className="text-primary underline">Contact support</Link> and
        include a screenshot of what you're seeing.
      </div>
    </div>
  </Layout>
);

export default UploadingImages;
