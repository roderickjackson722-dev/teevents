import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import DashboardMessages from "@/pages/dashboard/Messages";
import EmailTemplateEditor from "@/pages/dashboard/EmailTemplateEditor";

/** Renders the existing messaging tools inside the Enterprise shell (no behavior changes). */
export default function EnterpriseCommsTool({ tool }: { tool: "messages" | "email-templates" }) {
  const isMessages = tool === "messages";
  const title = isMessages ? "Email & Text Players" : "Email Templates & Receipts";
  return (
    <EnterpriseLayout
      title={title}
      description={isMessages ? "Send emails or texts to your players." : "Edit email wording and send receipts."}
      crumbs={[{ label: "Communications", to: "/enterprise/communications" }, { label: title }]}
    >
      {isMessages ? <DashboardMessages requirePreview /> : <EmailTemplateEditor requirePreview />}
    </EnterpriseLayout>
  );
}
