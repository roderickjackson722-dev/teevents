const RECEIPT_TYPE_LABELS = { registration: "Registration", addon: "Add-On / Extras", sponsorship: "Sponsorship", tax_deductible: "Tax-Deductible Donation" };
export interface EmailConfig {
  subject: string;
  greeting: string;
  body_text: string;
  closing_text: string;
  footer_text: string;
  primary_color: string;
  secondary_color: string;
  header_bg_color: string;
  text_color: string;
  show_event_details: boolean;
  show_logo: boolean;
  logo_url: string;
  logo_alignment: "left" | "center" | "right";
  /** Max rendered height of the header logo in the email, in px. */
  logo_max_height?: number;
  button_text: string;
  button_url: string;
  show_button: boolean;
  font_family: string;
  /** Day-before reminder: include the add-ons ("Don't Forget Your Mulligans!") section. */
  show_addons?: boolean;
  addons_heading?: string;
  addons_intro?: string;
  /** Day-before reminder: big action buttons for live scoring / leaderboard. */
  show_scoring_button?: boolean;
  scoring_button_text?: string;
  show_leaderboard_button?: boolean;
  leaderboard_button_text?: string;
  /** Editable headline shown in the colored email header band. */
  header_title?: string;
  /** Text color of the headline inside the colored header band. */
  header_text_color?: string;
  /** Organizer-edited schedule text used for {{event_schedule}} in this email. */
  schedule_override?: string;
  /** Day-before reminder: show the schedule block. */
  show_schedule?: boolean;
  schedule_heading?: string;
  /** Day-before reminder: show the plain "Event Homepage: <url>" text line. */
  show_homepage_link?: boolean;
  homepage_link_label?: string;
  /** Day-before reminder: order of the body sections, top to bottom. */
  section_order?: string[];
  /** Auto "Date & Location" block: labels and optional text overrides. */
  event_details_date_label?: string;
  event_details_location_label?: string;
  event_details_date_override?: string;
  event_details_location_override?: string;
}

/** Every movable block in the Day Before reminder, in default order. */
const DAY_BEFORE_SECTIONS: { id: string; label: string; hint: string }[] = [
  { id: "body", label: "Body text", hint: "Your main details paragraph (tee time, scoring code, etc.)" },
  { id: "schedule", label: "Event schedule", hint: "The schedule block from the Content tab / your event page" },
  { id: "closing", label: "Closing text", hint: "Your closing message" },
  { id: "action_buttons", label: "Scoring & Leaderboard buttons", hint: "“Enter My Scores” + “View Live Leaderboard”" },
  { id: "homepage_button", label: "“View Event Homepage” button", hint: "The gold call-to-action button" },
  { id: "homepage_link", label: "Event homepage link (text URL)", hint: "The plain “🔗 Event Homepage: https://…” line" },
  { id: "addons", label: "Add-ons / “Don’t Forget Your Mulligans!”", hint: "Purchasable add-on list with buy buttons" },
  { id: "footer", label: "Footer sign-off", hint: "Your closing sign-off line (e.g. “See you on the course!”)" },
];
const DEFAULT_SECTION_ORDER = DAY_BEFORE_SECTIONS.map((s) => s.id);

export type TemplateKind = "confirmation" | "sponsor" | "vendor" | "post_event" | "day_before" | "sponsor_day_of" | "sponsorship_day_of" | "pairings_update" | "tee_times" | "survey" | "receipt";


const DEFAULT_CONFIG: EmailConfig = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "We've received your registration for {{event_name}}. Thank you for signing up!",
  closing_text: "We look forward to seeing you there! Keep an eye on your inbox for any updates leading up to the event.",
  footer_text: "See you on the course! ⛳",
  primary_color: "#1a5c38",
  secondary_color: "#ffffff",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  show_event_details: true,
  show_logo: false,
  logo_url: "",
  logo_alignment: "center",
  logo_max_height: 60,
  button_text: "View Event Details",
  button_url: "",
  show_button: false,
  font_family: "Arial, sans-serif",
};

const DEFAULT_SPONSOR_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Thank you for sponsoring {{event_name}}!",
  greeting: "Hi {{first_name}},",
  body_text: "Thank you for your generous sponsorship of {{event_name}}. Your support makes this event possible and helps us deliver a memorable experience for every participant.",
  closing_text: "Our team will be in touch shortly with next steps, including logo submission and on-site benefits. In the meantime, please don't hesitate to reach out with any questions.",
  footer_text: "Thank you for partnering with us! ⛳",
  button_text: "View Sponsorship Details",
  show_event_details: true,
};

const DEFAULT_VENDOR_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Vendor Registration Confirmed — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text: "Your vendor booth is confirmed for {{event_name}}. Thank you for being part of the event.",
  closing_text: "Details on setup times, booth location, and load-in instructions will follow closer to the event date. Please reach out with any questions.",
  footer_text: "See you at the event! ⛳",
  button_text: "View Event Details",
  show_event_details: true,
};

const DEFAULT_POST_EVENT_CONFIG: EmailConfig = {
  subject: "Thanks for playing in {{event_name}}!",
  greeting: "Hi {{first_name}},",
  body_text:
    "Thank you for joining us at {{event_name}}! It was a fantastic day on the course and we couldn't have done it without you. Keep an eye out for final results, photos, and a recap coming soon.",
  closing_text:
    "Want to be the first to know about our next tournament? Click below to stay in the loop or sign up for the next event.",
  footer_text: "We hope to see you again soon! ⛳",
  primary_color: "#1a5c38",
  secondary_color: "#ffffff",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  show_event_details: false,
  show_logo: false,
  logo_url: "",
  logo_alignment: "center",
  logo_max_height: 60,
  button_text: "Sign Up for the Next Event",
  button_url: "",
  show_button: true,
  font_family: "Arial, sans-serif",
};

const DEFAULT_DAY_BEFORE_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Your tournament is almost here!",

  greeting: "Hello {{first_name}},",
  header_title: "Your Tournament Is Almost Here!",
  body_text:
    "Here are your final details for {{event_name}} at {{course_name}}.\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n🏠 Address: {{course_address}}\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n🔑 Your Scoring Code: {{scoring_code}}",
  closing_text:
    "Please arrive 30 minutes before your tee time.\n\nEnter your scores with your scoring code at:\n👉 {{scoring_link}}",
  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
  show_event_details: false,
  show_scoring_button: true,
  scoring_button_text: "Enter My Scores",
  show_leaderboard_button: true,
  leaderboard_button_text: "View Live Leaderboard",
  show_schedule: true,
  schedule_heading: "🗓 Event Schedule",
  show_homepage_link: true,
  homepage_link_label: "🔗 Event Homepage",
  section_order: DEFAULT_SECTION_ORDER,
};


const DEFAULT_SPONSOR_DAY_OF_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Sponsor Event Day Details",
  header_title: "Sponsor Event Day Details",
  greeting: "Hello {{sponsor_name}},",
  body_text:
    "Thank you for sponsoring {{event_name}}! We are excited to have you on board.\n\nHere are the details for event day:\n\n📅 Date: {{event_date}}\n📍 Course: {{course_name}}\n🕒 Check-in Time: {{checkin_time}}\n🏌️ Hole Assignment: Hole {{hole_number}}\n🅿️ Parking: {{parking_info}}\n📞 Event Contact: {{contact_name}} – {{contact_phone}}\n\nSpecial Notes:\n{{custom_notes}}",
  closing_text:
    "Important:\n• Please arrive at least 30 minutes before your assigned time to set up.\n• A table and two chairs will be provided at your hole.\n• If you need additional space or have special requests, please let us know in advance.\n\nIf you have any questions, contact us at info@teevents.golf.",
  footer_text: "We look forward to seeing you there!",
  show_event_details: false,
  show_button: false,
};

const DEFAULT_SPONSORSHIP_DAY_OF_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Your Hole Sponsor Details",
  header_title: "Thank You for Your Sponsorship!",
  greeting: "Dear {{sponsor_name}},",
  body_text:
    "Thank you for your generous support of {{event_name}}! We truly appreciate your partnership and are excited to have you as a Hole Sponsor.\n\nWe wanted to share a few quick details about your sponsorship:\n\n• Your company logo will be displayed on a hole sign at the tee box – your support will be visible to all players throughout the day.\n\n• Your logo will also be featured on our live scoring page and leaderboard – giving you additional exposure during and after the event.\n\nNo further action is needed on your part. We'll take care of everything to ensure your brand is recognized.",
  closing_text:
    "Thank you again for helping make this tournament a success. We look forward to seeing you on event day!\n\nBest regards,\n{{contact_name}}\n{{organization_name}}\n{{contact_phone}}\n{{contact_email}}",
  footer_text: "Thank you for your support! ⛳",
  show_event_details: false,
  show_button: false,
};

/** Updated pairings / hole assignments announcement. Pulls the live values from Players & Pairings. */
const DEFAULT_PAIRINGS_UPDATE_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Updated Hole Assignments",
  header_title: "Updated Hole Assignments",
  greeting: "Hello {{first_name}},",
  body_text:
    "We've updated the pairings for {{event_name}}. Please review your current assignment below — it may be different from your original confirmation email.\n\n🏌️ Starting Hole: {{hole_number}}\n👥 Team: {{team_name}}\n⏰ Tee Time: {{tee_time}}\n🔑 Your Scoring Code: {{scoring_code}}",
  closing_text:
    "Please plan to check in 30 minutes before your tee time and report directly to your starting hole.\n\nQuestions? Reply to this email or contact {{contact_name}} at {{contact_phone}}.",
  footer_text: "See you on the course! ⛳",
  button_text: "View Event Homepage",
  show_event_details: true,
  show_button: true,
};

/** Individual tee-time notice with a link to the full public pairings page. */
const DEFAULT_TEE_TIMES_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "{{event_name}} – Your Tee Time & Pairings",
  header_title: "Your Tee Time",
  greeting: "Hello {{first_name}},",
  body_text:
    "Here are your tee time details for {{event_name}}:\n\n⏰ Tee Time: {{tee_time}}\n🏌️ Starting Hole: {{hole_number}}\n👥 Your Team: {{team_name}}\n📅 Date: {{event_date}}\n📍 Course: {{course_name}}\n🔑 Your Scoring Code: {{scoring_code}}",
  closing_text:
    "Please arrive at least 30 minutes before your tee time and check in at the registration table.\n\nQuestions? Contact {{contact_name}} at {{contact_phone}}.",
  footer_text: "See you on the course! ⛳",
  button_text: "View All Tee Times & Pairings",
  show_event_details: true,
  show_button: true,
};

/**
 * Post-event survey invitation. The action button resolves to each player's
 * unique survey link at send time.
 */
const DEFAULT_SURVEY_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Tell us about your day at {{event_name}}",
  greeting: "Hi {{first_name}},",
  header_title: "We'd Love Your Feedback",
  body_text:
    "Thank you for playing in {{event_name}}! Your feedback helps us make next year's event even better.\n\nThe survey takes less than two minutes.",
  closing_text: "This survey link is unique to you, so you only need to fill it out once.",
  footer_text: "Thanks again for joining us! ⛳",
  button_text: "Take the Survey",
  button_url: "",
  show_button: true,
  show_event_details: false,
};

/**
 * Itemized payment receipt. The amounts (item, service fee, processing /
 * credit card fee, total) are auto-filled from the real payment on the Send tab
 * and can be edited before sending.
 */
const DEFAULT_RECEIPT_CONFIG: EmailConfig = {
  ...DEFAULT_CONFIG,
  subject: "Your receipt for {{event_name}}",
  header_title: "Payment Receipt",
  greeting: "Hi {{payer_name}},",
  body_text:
    "Thank you for your payment for {{event_name}}. Here is your receipt for your records.\n\nReceipt #: {{receipt_number}}\nDate: {{receipt_date}}\nPaid by: {{payment_method}}\n\nItem: {{receipt_item}}\nAmount: {{receipt_subtotal}}\nService fee: {{service_fee}}\nProcessing / credit card fee: {{processing_fee}}\n\nTotal charged: {{receipt_total}}",
  closing_text:
    "Please keep this receipt for your records. If anything looks incorrect, reply to this email and we'll take care of it.",
  footer_text: "Thank you for your support! ⛳",
  show_event_details: true,
  show_button: false,
};

const RECEIPT_TYPE_DEFAULTS: Record<string, Partial<EmailConfig>> = {
  registration: {},
  addon: {
    subject: "Your receipt for your {{event_name}} add-ons",
    header_title: "Add-On Purchase Receipt",
    body_text:
      "Thank you for your add-on purchase for {{event_name}}. Here is your receipt for your records.\n\nReceipt #: {{receipt_number}}\nDate: {{receipt_date}}\nPaid by: {{payment_method}}\n\nItem: {{receipt_item}}\nAmount: {{receipt_subtotal}}\nService fee: {{service_fee}}\nProcessing / credit card fee: {{processing_fee}}\n\nTotal charged: {{receipt_total}}",
  },
  sponsorship: {
    subject: "Your sponsorship receipt for {{event_name}}",
    header_title: "Sponsorship Receipt",
    body_text:
      "Thank you for your generous sponsorship of {{event_name}}. Here is your receipt for your records.\n\nReceipt #: {{receipt_number}}\nDate: {{receipt_date}}\nPaid by: {{payment_method}}\n\nSponsorship: {{receipt_item}}\nAmount: {{receipt_subtotal}}\nService fee: {{service_fee}}\nProcessing / credit card fee: {{processing_fee}}\n\nTotal charged: {{receipt_total}}",
    closing_text:
      "Please keep this receipt for your records. If you need a tax donation receipt as well, just reply to this email and we'll send one over.",
  },
  // 501(c)(3) acknowledgement letter wording — organizers can edit every line.
  tax_deductible: {
    subject: "Your tax-deductible donation receipt for {{event_name}}",
    header_title: "Tax-Deductible Donation Receipt",
    greeting: "Dear {{payer_name}},",
    body_text:
      "Thank you for your generous contribution in support of {{event_name}}.\n\nOrganization: {{nonprofit_name}}\nEIN: {{ein}}\n{{org_address}}\n\nReceipt #: {{receipt_number}}\nDate of contribution: {{receipt_date}}\nDescription: {{receipt_item}}\n\nContribution amount: {{receipt_total}}\n\nNo goods or services were provided in exchange for this contribution.",
    closing_text:
      "{{nonprofit_name}} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code. This contribution is tax-deductible to the extent allowed by law. Please retain this receipt for your tax records.",
    footer_text: "Thank you for your generous support! ⛳",
    show_event_details: false,
  },
};

const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  confirmation: "Player / Registrant Confirmation",
  sponsor: "Sponsor Confirmation",
  vendor: "Vendor Confirmation",
  post_event: "Post-Event Thank You",
  day_before: "Day Before Event Reminder",
  sponsor_day_of: "Sponsor Event Day Details",
  sponsorship_day_of: "Day of Event Sponsorship Email",
  pairings_update: "Updated Hole Assignments / Pairings",
  tee_times: "Tee Times & Pairings (individual players)",
  survey: "Post-Event Survey Invitation",
  receipt: "Payment Receipt",
};

export const TEMPLATE_HEADERS: Record<TemplateKind, string> = {
  confirmation: "Registration Confirmed!",
  sponsor: "Thank You for Sponsoring!",
  vendor: "Vendor Registration Confirmed!",
  post_event: "Thanks for Playing!",
  day_before: "Your Tournament Is Almost Here!",
  sponsor_day_of: "Sponsor Event Day Details",
  sponsorship_day_of: "Thank You for Your Sponsorship!",
  pairings_update: "Updated Hole Assignments",
  tee_times: "Your Tee Time",
  survey: "We'd Love Your Feedback",
  receipt: "Payment Receipt",
};

const CONFIG_KEY: Record<TemplateKind, string> = {
  confirmation: "confirmation_email_config",
  sponsor: "sponsor_email_config",
  vendor: "vendor_email_config",
  post_event: "post_event_email_config",
  day_before: "day_before_email_config",
  sponsor_day_of: "sponsor_day_of_email_config",
  sponsorship_day_of: "sponsorship_day_of_email_config",
  pairings_update: "pairings_update_email_config",
  tee_times: "tee_times_email_config",
  survey: "survey_email_config",
  receipt: "receipt_email_config",
};



const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export const VARIABLE_TAGS = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Event Name", value: "{{event_name}}" },
  { label: "Event Date", value: "{{event_date}}" },
  { label: "Event Location", value: "{{event_location}}" },
  { label: "Course Name", value: "{{course_name}}" },
  { label: "Course Address", value: "{{course_address}}" },
  { label: "Event Schedule", value: "{{event_schedule}}" },
  { label: "Tee Time", value: "{{tee_time}}" },
  { label: "Starting Hole", value: "{{hole_number}}" },
  { label: "Scoring Code", value: "{{scoring_code}}" },
  { label: "Group Number", value: "{{group_number}}" },
  { label: "Team / Group Name", value: "{{team_name}}" },
  { label: "Scoring Link", value: "{{scoring_link}}" },
  { label: "Leaderboard Link", value: "{{leaderboard_link}}" },
  { label: "Event Homepage", value: "{{event_homepage}}" },
  { label: "Pairings / Tee Sheet Link", value: "{{pairings_link}}" },
  { label: "Survey Link", value: "{{survey_link}}" },
  { label: "Sponsor Name", value: "{{sponsor_name}}" },
  { label: "Sponsor Tier", value: "{{sponsor_tier}}" },
  { label: "Check-in Time", value: "{{checkin_time}}" },
  { label: "Parking Info", value: "{{parking_info}}" },
  { label: "Custom Notes", value: "{{custom_notes}}" },
  { label: "Contact Name", value: "{{contact_name}}" },
  { label: "Contact Phone", value: "{{contact_phone}}" },
  { label: "Contact Email", value: "{{contact_email}}" },
  { label: "Organization Name", value: "{{organization_name}}" },
  { label: "Receipt: Paid By", value: "{{payer_name}}" },
  { label: "Receipt: Number", value: "{{receipt_number}}" },
  { label: "Receipt: Date", value: "{{receipt_date}}" },
  { label: "Receipt: Item", value: "{{receipt_item}}" },
  { label: "Receipt: Amount", value: "{{receipt_subtotal}}" },
  { label: "Receipt: Service Fee", value: "{{service_fee}}" },
  { label: "Receipt: Processing Fee", value: "{{processing_fee}}" },
  { label: "Receipt: Total Charged", value: "{{receipt_total}}" },
  { label: "Receipt: Payment Method", value: "{{payment_method}}" },
  { label: "Receipt: Nonprofit Name", value: "{{nonprofit_name}}" },
  { label: "Receipt: EIN", value: "{{ein}}" },
  { label: "Receipt: Org Address", value: "{{org_address}}" },
];

const SAMPLE_VARS: Record<string, string> = {
  course_name: "Pine Valley Golf Club",
  course_address: "1 Clubhouse Dr, Pine Valley, NJ 08021",
  event_schedule: "7:30 AM — Check-in & breakfast\n9:00 AM — Shotgun start\n2:00 PM — Lunch & awards",
  tee_time: "8:30 AM",
  hole_number: "5",
  team_name: "Team Birdie",
  scoring_code: "ABC123",
  scoring_link: "https://www.teevents.golf/t/sample/scoring",
  leaderboard_link: "https://www.teevents.golf/live/sample",
  event_homepage: "https://www.teevents.golf/t/sample",
  pairings_link: "https://www.teevents.golf/pairings/sample",
};

export function replaceVariablesPlain(text: string, vars: Record<string, string>): string {
  const merged = { ...SAMPLE_VARS, ...vars };
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True when organizer content was authored with the rich-text toolbar. */
function isHtmlContent(s?: string): boolean {
  return /<(p|br|div|ul|ol|li|strong|em|u|s|h[1-3]|a|span|img|blockquote)\b/i.test(s || "");
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  const merged = { ...SAMPLE_VARS, ...vars };
  if (isHtmlContent(text)) {
    // A block schedule cannot legally sit inside a paragraph. Rich-text editors
    // commonly wrap the variable in <p>, so unwrap it before inserting headings/lists.
    return (text || "")
      .replace(/<p(?:\s[^>]*)?>\s*\{\{event_schedule\}\}\s*<\/p>/gi, merged.event_schedule || "")
      .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "");
  }
  return escapeHtml(text || "")
    .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => merged[k] ?? "")
    .replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#1a5c38;font-weight:600;">${u}</a>`)
    .replace(/\n/g, "<br/>");
}

function removeDuplicateLeaderboardText(text: string): string {
  return (text || "")
    .replace(/<p[^>]*>\s*View the live leaderboard:\s*<\/p>\s*<p[^>]*>\s*👉\s*\{\{leaderboard_link\}\}\s*<\/p>/gi, "")
    .replace(/(?:<p[^>]*>)?\s*View the live leaderboard:\s*(?:<br\s*\/?>(?:\s|&nbsp;)*)?👉\s*\{\{leaderboard_link\}\}\s*(?:<\/p>)?/gi, "")
    .replace(/\n*View the live leaderboard:\s*\n\s*👉\s*\{\{leaderboard_link\}\}/gi, "")
    .trim();
}

/** Pull the legacy schedule / homepage lines out of the body so they become their own movable blocks. */
function stripLegacyDayBeforeBlocks(bt: string): string {
  return (bt || "")
    .replace(/<p[^>]*>\s*(?:🗓\s*)?Event Schedule:?\s*<\/p>/gi, "")
    .replace(/<p[^>]*>\s*\{\{event_schedule\}\}\s*<\/p>/gi, "")
    .replace(/<p[^>]*>\s*🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}\s*<\/p>/gi, "")
    .replace(/(?:🗓\s*)?Event Schedule:?\s*\n?/gi, "")
    .replace(/🔗?\s*Event Homepage:?\s*\{\{event_homepage\}\}/gi, "")
    .replace(/\{\{event_schedule\}\}/g, "")
    .replace(/\{\{event_homepage\}\}/g, "")
    .replace(/(?:<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)+$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalizes a Day Before reminder config: every block (body, schedule, closing,
 * buttons, homepage link, add-ons, footer) is independent and ordered by
 * `section_order`, so organizers can move or remove any of them.
 */
function normalizeDayBefore(cfg: EmailConfig): EmailConfig {
  const hadHomepage = /\{\{event_homepage\}\}/i.test(String(cfg.body_text || ""));
  const stored = Array.isArray(cfg.section_order) ? cfg.section_order.filter((s) => DEFAULT_SECTION_ORDER.includes(s)) : [];
  const order = stored.length
    ? [...stored, ...DEFAULT_SECTION_ORDER.filter((s) => !stored.includes(s))]
    : [...DEFAULT_SECTION_ORDER];
  return {
    ...cfg,
    body_text: stripLegacyDayBeforeBlocks(String(cfg.body_text || "")),
    closing_text: removeDuplicateLeaderboardText(
      String(cfg.closing_text ?? "").replace(/\{\{scoring_link\}\}\./g, "{{scoring_link}}"),
    ),
    show_schedule: cfg.show_schedule ?? true,
    schedule_heading: cfg.schedule_heading ?? "🗓 Event Schedule",
    show_homepage_link: cfg.show_homepage_link ?? (cfg.section_order ? false : hadHomepage),
    homepage_link_label: cfg.homepage_link_label ?? "🔗 Event Homepage",
    section_order: order,
  };
}



function renderActionButtons(opts: {
  primary: string;
  scoring: { url: string; text: string } | null;
  leaderboard: { url: string; text: string } | null;
}): string {
  const cells: string[] = [];
  if (opts.scoring) {
    cells.push(`<a href="${opts.scoring.url}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">⛳ ${escapeHtml(opts.scoring.text)}</a>`);
  }
  if (opts.leaderboard) {
    cells.push(`<a href="${opts.leaderboard.url}" style="display:inline-block;margin:6px;padding:13px 26px;background-color:${opts.primary};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">📊 ${escapeHtml(opts.leaderboard.text)}</a>`);
  }
  if (!cells.length) return "";
  return `<div style="text-align:center;margin:22px 0;padding:18px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">${cells.join("")}</div>`;
}

export function renderEmailHtml(
  config: EmailConfig,
  vars: Record<string, string>,
  headerText: string = "Registration Confirmed!",
  opts?: { includePlayerHub?: boolean; hubUrl?: string; qrImg?: string; addons?: any[]; addonBaseUrl?: string; showActionButtons?: boolean; sectionOrder?: string[] },
): string {
  const greeting = replaceVariables(config.greeting, vars);
  const body = replaceVariables(config.body_text, vars);
  const closing = replaceVariables(config.closing_text, vars);
  const footer = replaceVariables(config.footer_text, vars);


  const detailsDate = (config.event_details_date_override ?? "").trim() || vars.event_date;
  const detailsLocation = (config.event_details_location_override ?? "").trim() || vars.event_location;
  const detailsDateLabel = config.event_details_date_label ?? "Date:";
  const detailsLocationLabel = config.event_details_location_label ?? "Location:";
  const eventDetailsHtml = config.show_event_details && (detailsDate || detailsLocation)
    ? `<div style="margin:16px 0;">
        ${detailsDate ? `<p style="margin:0 0 6px;color:${config.text_color};font-size:15px;">📅 <strong>${escapeHtml(detailsDateLabel)}</strong> ${detailsDate}</p>` : ""}
        ${detailsLocation ? `<p style="margin:0;color:${config.text_color};font-size:15px;">📍 <strong>${escapeHtml(detailsLocationLabel)}</strong> ${detailsLocation}</p>` : ""}
       </div>`
    : "";

  const align = config.logo_alignment || "center";
  const logoHtml = config.show_logo && config.logo_url
    ? `<div style="text-align:${align};margin-bottom:12px;"><img src="${config.logo_url}" alt="Logo" height="${config.logo_max_height || 60}" style="max-height:${config.logo_max_height || 60}px;max-width:100%;height:auto;display:inline-block;" /></div>`
    : "";

  const buttonHtml = config.show_button && config.button_text
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${config.button_url || '#'}" style="display:inline-block;padding:12px 28px;background:${config.primary_color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${config.button_text}</a>
       </div>`
    : "";

  const scoringUrl = vars.scoring_link || SAMPLE_VARS.scoring_link;
  const leaderboardUrl = vars.leaderboard_link || SAMPLE_VARS.leaderboard_link;
  const actionButtonsHtml = opts?.showActionButtons
    ? renderActionButtons({
        primary: config.primary_color,
        scoring: config.show_scoring_button !== false ? { url: scoringUrl, text: config.scoring_button_text || "Enter My Scores" } : null,
        leaderboard: config.show_leaderboard_button !== false ? { url: leaderboardUrl, text: config.leaderboard_button_text || "View Live Leaderboard" } : null,
      })
    : "";

  const hubUrl = opts?.hubUrl || "https://www.teevents.golf/player/sample/preview";
  const qrImg = opts?.qrImg || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(hubUrl)}`;
  const hubBlock = opts?.includePlayerHub
    ? `<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;">
        <p style="margin:0 0 6px;color:${config.primary_color};font-size:16px;font-weight:700;">📱 Your Personal Player Hub</p>
        <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">Scan or tap on event day for live scoring, leaderboard, schedule &amp; more — no login needed.</p>
        <a href="${hubUrl}" style="text-decoration:none;"><img src="${qrImg}" width="180" height="180" alt="Player Hub QR Code" style="display:block;margin:0 auto 12px;border:6px solid #ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);"/></a>
        <a href="${hubUrl}" style="display:inline-block;padding:10px 22px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;">Open My Player Hub</a>
        <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Bookmark this link on your phone — it's your personal pass for the entire tournament.</p>
       </td></tr>`
    : "";

  const addonList = opts?.addons || [];
  const addonBase = opts?.addonBaseUrl || vars.event_homepage || "https://www.teevents.golf";
  const money = (c: number) => `$${((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const addonsInner = `
        <p style="margin:0 0 6px;color:${config.primary_color};font-size:17px;font-weight:700;">${escapeHtml(config.addons_heading || "⛳ Don't Forget Your Mulligans!")}</p>
        ${config.addons_intro ? `<p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5;">${escapeHtml(config.addons_intro)}</p>` : ""}
        ${addonList.map((a: any) => `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
            <tr>
              <td style="padding:12px 14px;font-size:14px;color:${config.text_color};">
                <strong>${escapeHtml(a.name || "")}</strong> — ${money(a.price_cents)}
                ${a.description ? `<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(a.description)}</span>` : ""}
              </td>
              <td align="right" style="padding:12px 14px;">
                <a href="${addonBase}/add-ons?addon=${a.id}" style="display:inline-block;padding:9px 16px;background-color:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;white-space:nowrap;">Purchase Now</a>
              </td>
            </tr>
          </table>`).join("")}`;
  const showAddons = config.show_addons !== false && addonList.length > 0;
  const addonsHtml = showAddons && !opts?.sectionOrder
    ? `<tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#fffdf5;">${addonsInner}</td></tr>`
    : "";

  const richBlock = (html: string) =>
    `<div class="tv-rich" style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;overflow-wrap:anywhere;word-break:normal;">${html}</div>`;
  const footerBlock = `<p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${footer}</p>`;

  // Day-before reminders render every block independently, in the organizer's order.
  const homepageUrl = config.button_url || vars.event_homepage || "https://www.teevents.golf";
  const orderedBlocks = (opts?.sectionOrder || [])
    .map((id) => {
      switch (id) {
        case "body":
          return body?.trim() ? richBlock(body) : "";
        case "schedule":
          return config.show_schedule !== false && vars.event_schedule
            ? `${config.schedule_heading ? `<p style="margin:18px 0 8px;color:${config.text_color};font-size:15px;font-weight:700;">${escapeHtml(config.schedule_heading)}</p>` : ""}${richBlock(vars.event_schedule)}`
            : "";
        case "closing":
          return closing?.trim() ? richBlock(closing) : "";
        case "action_buttons":
          return actionButtonsHtml;
        case "homepage_button":
          return config.show_button !== false && config.button_text
            ? `<div style="text-align:center;margin:24px 0;"><a href="${homepageUrl}" style="display:inline-block;padding:12px 28px;background:#F5A623;color:#1a5c38;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(config.button_text)}</a></div>`
            : "";
        case "homepage_link":
          return config.show_homepage_link
            ? `<p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;">${escapeHtml(config.homepage_link_label || "🔗 Event Homepage")}: <a href="${homepageUrl}" style="color:${config.primary_color};font-weight:600;">${homepageUrl}</a></p>`
            : "";
        case "addons":
          return showAddons
            ? `<div style="margin:22px 0;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#fffdf5;">${addonsInner}</div>`
            : "";
        case "footer":
          return footerBlock;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("");

  const contentHtml = opts?.sectionOrder
    ? orderedBlocks
    : `${richBlock(body)}${eventDetailsHtml}${richBlock(closing)}${actionButtonsHtml}${buttonHtml}<p style="margin:0;color:${config.text_color};font-size:15px;line-height:1.7;">${footer}</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  .tv-rich h1, .tv-rich h2 { margin:0 0 10px;font-size:17px;line-height:1.35;font-weight:700; }
  .tv-rich h3 { margin:20px 0 8px;font-size:15px;line-height:1.4;font-weight:700; }
  .tv-rich h3:first-child { margin-top:0; }
  .tv-rich p { margin:0;line-height:1.55; }
  .tv-rich p + p { margin-top:14px; }
  .tv-rich ul, .tv-rich ol { margin:6px 0 16px;padding-left:22px; }
  .tv-rich li { margin:0 0 6px;line-height:1.5; }
  .tv-rich section { margin:0 0 18px;padding:0 0 18px;border-bottom:1px solid #e5e7eb; }
  .tv-rich section:last-child { margin-bottom:0;padding-bottom:0;border-bottom:0; }
  @media only screen and (max-width:600px) {
    .tv-wrap { padding:16px 10px !important; }
    .tv-card { width:100% !important; }
    .tv-pad { padding:20px 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${config.font_family};">
  <table width="100%" cellpadding="0" cellspacing="0" class="tv-wrap" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" class="tv-card" style="max-width:100%;background:${config.secondary_color};border-radius:8px;overflow:hidden;">
        <tr><td class="tv-pad" style="background:${config.header_bg_color};padding:28px 32px;text-align:center;">
          ${logoHtml}
          <h1 style="margin:0;color:${config.header_text_color || "#ffffff"};font-size:22px;font-weight:700;">${headerText}</h1>
        </td></tr>
        <tr><td class="tv-pad" style="padding:32px;">
          <p style="margin:0 0 14px;color:${config.text_color};font-size:15px;line-height:1.7;"><strong>${greeting}</strong></p>
          ${contentHtml}
        </td></tr>${addonsHtml}${hubBlock}

        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent by TeeVents • <a href="https://teevents.golf" style="color:${config.primary_color};">teevents.golf</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function defaultsForTemplate(kind: string): EmailConfig {
 const configs: Record<string, EmailConfig> = {confirmation: DEFAULT_CONFIG, sponsor: DEFAULT_SPONSOR_CONFIG, vendor: DEFAULT_VENDOR_CONFIG, post_event: DEFAULT_POST_EVENT_CONFIG, day_before: DEFAULT_DAY_BEFORE_CONFIG, sponsor_day_of: DEFAULT_SPONSOR_DAY_OF_CONFIG, sponsorship_day_of: DEFAULT_SPONSORSHIP_DAY_OF_CONFIG, pairings_update: DEFAULT_PAIRINGS_UPDATE_CONFIG, tee_times: DEFAULT_TEE_TIMES_CONFIG, survey: DEFAULT_SURVEY_CONFIG, receipt: DEFAULT_RECEIPT_CONFIG};
 return structuredClone(configs[kind] || DEFAULT_CONFIG);
}
const THANK_YOU_TEMPLATES = [
 {id:'builtin:sponsor_thank_you',name:'Sponsor Thank You',source_kind:'sponsor',config:{...DEFAULT_SPONSOR_CONFIG,header_title:'Thank You for Your Sponsorship!',subject:'Thank you for supporting {{event_name}}!',greeting:'Dear {{sponsor_name}},',body_text:'Thank you for sponsoring {{event_name}}! Your generosity helped make the day a success, and we are grateful for your partnership.\n\nWe hope you will join us again next year.',closing_text:'With appreciation,\n{{contact_name}}\n{{organization_name}}',footer_text:'Thank you for your support! ⛳'}},
 {id:'builtin:vendor_thank_you',name:'Vendor Thank You',source_kind:'vendor',config:{...DEFAULT_VENDOR_CONFIG,header_title:'Thank You for Joining Us!',subject:'Thank you for being a vendor at {{event_name}}!',greeting:'Hello {{sponsor_name}},',body_text:'Thank you for being part of {{event_name}} as a vendor. Your presence added so much to the day for our players and guests.\n\nWe would love to have you back at our next event.',closing_text:'With appreciation,\n{{contact_name}}\n{{organization_name}}',footer_text:'Thank you for being part of the event! ⛳'}},
];
export function catalogForEvent(event: any) {
 return [...THANK_YOU_TEMPLATES.map(t=>({...t,config:structuredClone(t.config),updated_at:null})), ...Object.entries(TEMPLATE_LABELS).flatMap(([kind, name]) => kind === 'receipt'
 ? Object.entries(RECEIPT_TYPE_DEFAULTS).map(([type, overrides]) => ({id: `builtin:receipt:${type}`, name: `${name} — ${type.replaceAll('_',' ')}`, source_kind: kind, config: {...defaultsForTemplate(kind), ...overrides, ...(event?.receipt_email_config?.[type] || {})}, updated_at: null}))
 : [{id: `builtin:${kind}`, name, source_kind: kind, config: {...defaultsForTemplate(kind), ...(event?.[CONFIG_KEY[kind as TemplateKind]] || {})}, updated_at: null}])];
}
