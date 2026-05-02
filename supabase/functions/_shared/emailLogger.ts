// Shared email logger. Every Resend send should call logEmailSend.
// Best-effort — never throws so it can't break the user-facing email flow.

export interface LogEmailParams {
  messageId?: string;
  templateName: string;
  recipientEmail: string;
  subject?: string;
  status: "pending" | "sent" | "failed" | "bounced" | "complained" | "suppressed";
  source?: string;
  resendId?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  organizationId?: string | null;
  tournamentId?: string | null;
  triggeredBy?: string | null;
}

export async function logEmailSend(supabaseAdmin: any, params: LogEmailParams): Promise<void> {
  try {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: params.messageId || crypto.randomUUID(),
      template_name: params.templateName,
      recipient_email: params.recipientEmail,
      subject: params.subject || null,
      status: params.status,
      source: params.source || null,
      resend_id: params.resendId || null,
      error_message: params.errorMessage || null,
      metadata: params.metadata || {},
      organization_id: params.organizationId || null,
      tournament_id: params.tournamentId || null,
      triggered_by: params.triggeredBy || null,
    });
  } catch (e) {
    console.error("[emailLogger] insert failed:", e);
  }
}

// Convenience: send via Resend AND log the result.
export async function sendAndLog(
  supabaseAdmin: any,
  resendApiKey: string,
  payload: { from: string; to: string | string[]; subject: string; html?: string; text?: string; reply_to?: string },
  logMeta: Omit<LogEmailParams, "status" | "recipientEmail" | "subject" | "resendId" | "errorMessage">,
): Promise<{ ok: boolean; resendId?: string; error?: string }> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const messageId = logMeta.messageId || crypto.randomUUID();

  // Mark pending for each recipient
  for (const r of recipients) {
    await logEmailSend(supabaseAdmin, {
      ...logMeta,
      messageId,
      recipientEmail: r,
      subject: payload.subject,
      status: "pending",
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.message || data?.error || `Resend HTTP ${res.status}`;
      for (const r of recipients) {
        await logEmailSend(supabaseAdmin, {
          ...logMeta,
          messageId,
          recipientEmail: r,
          subject: payload.subject,
          status: "failed",
          errorMessage: errMsg,
        });
      }
      return { ok: false, error: errMsg };
    }

    for (const r of recipients) {
      await logEmailSend(supabaseAdmin, {
        ...logMeta,
        messageId,
        recipientEmail: r,
        subject: payload.subject,
        status: "sent",
        resendId: data?.id || null,
      });
    }
    return { ok: true, resendId: data?.id };
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    for (const r of recipients) {
      await logEmailSend(supabaseAdmin, {
        ...logMeta,
        messageId,
        recipientEmail: r,
        subject: payload.subject,
        status: "failed",
        errorMessage: errMsg,
      });
    }
    return { ok: false, error: errMsg };
  }
}
