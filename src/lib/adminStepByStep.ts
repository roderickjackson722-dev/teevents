import shotNonprofit from "@/assets/help/nonprofit-settings.png";
import shotReceiptDesign from "@/assets/help/email-templates-receipt.png";
import shotReceiptContent from "@/assets/help/receipt-content.png";
import shotReceiptSend from "@/assets/help/receipt-send.png";
import shotTransactions from "@/assets/help/transactions.png";
import shotSponsors from "@/assets/help/sponsors.png";
import shotPageEditor from "@/assets/help/public-page-editor.png";
import shotPrintables from "@/assets/help/printables.png";
import shotShareQr from "@/assets/help/share-promote-qr.png";
import shotShareSocial from "@/assets/help/share-promote-social.png";
import shotShareAnalytics from "@/assets/help/share-promote-analytics.png";

export interface AdminGuideStep {
  text: string;
  /** Optional screenshot shown under the step. */
  image?: string;
  imageCaption?: string;
}

export interface AdminGuide {
  key: string;
  title: string;
  category: string;
  summary: string;
  /** Where the feature lives, shown as a breadcrumb. */
  path: string;
  steps: AdminGuideStep[];
  tips?: string[];
  troubleshooting?: { issue: string; solution: string }[];
}

export const ADMIN_GUIDES: AdminGuide[] = [
  {
    key: "share-and-promote",
    title: "Share your event with trackable links",
    category: "Marketing",
    summary:
      "Grab your event's QR code, copy ready-made share links for Facebook, LinkedIn, text and email, and watch which ones bring players in.",
    path: "Marketing → Share & Promote",
    steps: [
      {
        text: "In the organizer dashboard, open the Marketing group in the left menu and click Share & Promote. Make sure the right event is selected in the picker at the top of the screen.",
      },
      {
        text: "On the QR Code tab you'll find your branded tournament QR code. Download it as PNG for flyers and posters, SVG for designers, or JPG for websites — or click Copy Link to use the same address in text.",
        image: shotShareQr,
        imageCaption:
          "The QR Code tab: tournament QR code, the players' Team Homepage QR, and every share link with a copy button.",
      },
      {
        text: "In the Share Links box on the same tab, copy the link you need — Registration Page, QR Code Link, Facebook, LinkedIn, Text Message or Email. Each link carries a ?ref= tag (like ?ref=facebook) so you can tell where every visitor came from.",
      },
      {
        text: "Tip: for text messages and social posts, use the Text / Social Preview Link at the top of the box. It makes the message preview show your event's own name and image instead of a generic TeeVents description.",
      },
      {
        text: "Open the Social & Email tab for ready-made posts. Facebook, LinkedIn, an email template and a text message are already written with your event name, date, course and link filled in — click Copy Caption or Copy Message, then paste and post.",
        image: shotShareSocial,
        imageCaption: "Ready-to-send captions for Facebook, LinkedIn, email and text messages.",
      },
      {
        text: "Open the Analytics tab to see what's working: QR scans, link clicks, social and email clicks, total clicks, and a mobile / desktop / tablet breakdown.",
        image: shotShareAnalytics,
        imageCaption: "The Analytics tab tracks every scan and click by source and device.",
      },
    ],
    tips: [
      "The Team Homepage QR is for your players — it opens their mobile page with the alpha list, tee times, live leaderboard and scoring entry.",
      "Downloads are print-ready: the PNG renders at about 300 DPI, so it stays sharp on printed flyers and table tents.",
      "Counts update as people click, so check Analytics a day or two after each email blast or post.",
    ],
    troubleshooting: [
      {
        issue: "The QR code or links show the wrong event.",
        solution:
          "Use the event picker at the top of the dashboard to switch to the event you want to promote.",
      },
      {
        issue: "The Analytics tab shows zeros.",
        solution:
          "Counts only start after people use your links — share them first, then give it a little time.",
      },
    ],
  },
    key: "tax-deductible-receipts",
    title: "Send a tax-deductible donation receipt",
    category: "Receipts & Emails",
    summary:
      "Turn on nonprofit status, edit the tax-deductible donation receipt, auto-fill the amounts and fees, then email it to a donor or download it to send yourself.",
    path: "General Settings → Nonprofit / 501(c)(3) Status → Email Templates → Payment Receipt → Tax-Deductible Donation",
    steps: [
      {
        text: "In the organizer dashboard, open the Settings group at the bottom of the left menu and click General Settings. Scroll to the Nonprofit / 501(c)(3) Status box.",
      },
      {
        text: "Fill in the organization name that should appear on receipts, the EIN (optional — nothing is verified), and the mailing address, then click Enable Nonprofit Features. Click View & Edit Donation Receipt to jump straight to the receipt template.",
        image: shotNonprofit,
        imageCaption:
          "Nonprofit / 501(c)(3) Status in General Settings, with the View & Edit Donation Receipt button.",
      },
      {
        text: "You land on Email Templates with Payment Receipt selected and Receipt for set to Tax-Deductible Donation. Use the Design tab to change the header band, colors, logo and fonts.",
        image: shotReceiptDesign,
        imageCaption:
          "Email Templates → Payment Receipt → Tax-Deductible Donation, Design tab.",
      },
      {
        text: "Open the Content tab to edit the subject, greeting, body and closing. Insert the merge tags — {{payer_name}}, {{receipt_total}}, {{service_fee}}, {{processing_fee}}, {{nonprofit_name}}, {{ein}}, {{org_address}} — anywhere you want the real values filled in. Click Save Template.",
        image: shotReceiptContent,
        imageCaption: "Content tab — wording and merge tags for the receipt.",
      },
      {
        text: "Open the Send tab. Pick the payment from the Payment dropdown and the item, amount, service fee, credit card fee and total fill in automatically. Everything stays editable, including the receipt number and date.",
        image: shotReceiptSend,
        imageCaption:
          "Send tab — auto-filled amounts, recipient picker, and send/copy/download buttons.",
      },
      {
        text: "Under Send to, choose Pick from registrants and select the donor, or choose Enter an email and type any address. Click Send receipt.",
      },
      {
        text: "Need to send it from your own inbox instead? Use Copy as text, Copy HTML or Download and the finished receipt comes with you — the download opens in any browser and prints to PDF.",
      },
    ],
    tips: [
      "Each receipt type (Registration, Add-On / Extras, Sponsorship, Tax-Deductible Donation) saves its own wording — editing one never changes the others.",
      "The tax-deductible wording already includes the 'no goods or services were provided' line donors need for their taxes.",
      "Check the live preview at the bottom of the Send tab before sending — it is exactly what the donor receives.",
    ],
    troubleshooting: [
      {
        issue: "The amounts are blank.",
        solution:
          "Pick a payment in the Payment dropdown on the Send tab, or type the amounts in by hand.",
      },
      {
        issue: "The organization name or EIN is missing on the receipt.",
        solution:
          "Fill them in under General Settings → Nonprofit / 501(c)(3) Status and save, then reload the template.",
      },
      {
        issue: "Send receipt is greyed out.",
        solution: "Choose a registrant or enter an email address first.",
      },
    ],
  },
  {
    key: "payment-receipts",
    title: "Send a registration, add-on or sponsorship receipt",
    category: "Receipts & Emails",
    summary:
      "Use the same Payment Receipt template to send an itemized receipt for a registration, an add-on purchase or a sponsorship.",
    path: "Email Templates → Payment Receipt",
    steps: [
      { text: "Open Email Templates from the Marketing group in the left menu." },
      {
        text: "In the template dropdown at the top right choose Payment Receipt, then set Receipt for to Registration, Add-On / Extras or Sponsorship.",
        image: shotReceiptDesign,
        imageCaption: "Choosing the receipt type.",
      },
      {
        text: "Edit the wording on the Content tab and the look on the Design tab, then click Save Template.",
      },
      {
        text: "On the Send tab pick the payment to auto-fill the amounts, choose the recipient, and Send receipt — or copy/download it to send yourself.",
        image: shotReceiptSend,
        imageCaption: "The Send tab with auto-filled totals and fees.",
      },
    ],
    tips: [
      "The service fee and credit card fee lines come from the actual transaction, so the total always matches what the payer was charged.",
    ],
  },
  {
    key: "email-templates",
    title: "Customize any email template",
    category: "Receipts & Emails",
    summary:
      "Edit the design and wording of confirmations, sponsor emails, day-before reminders, tee times, surveys and receipts.",
    path: "Email Templates",
    steps: [
      { text: "Open Email Templates from the Marketing group." },
      { text: "Pick the template you want from the dropdown at the top right." },
      { text: "Use the Design tab for colors, logo and header, and the Content tab for wording." },
      { text: "Preview it, click Save Template, then use the Send tab to send it." },
      { text: "Use Apply design to all to reuse the same look across every template." },
    ],
    tips: ["Templates save per tournament — switch events with the selector at the top."],
  },
  {
    key: "transactions",
    title: "Review payments and fees",
    category: "Money",
    summary:
      "See every payment, the 5% service fee, credit card processing, and your net proceeds.",
    path: "Finances → Transactions",
    steps: [
      { text: "Open Transactions in the Finances group of the left menu." },
      {
        text: "Filter by type or date to find a payment, and open a row to see the fee breakdown.",
        image: shotTransactions,
        imageCaption: "The Transactions list.",
      },
      { text: "Export to CSV for your bookkeeping, or send a receipt for any payment from Email Templates." },
    ],
  },
  {
    key: "sponsors",
    title: "Add and manage sponsors",
    category: "Fundraising",
    summary: "Create sponsorship levels, add sponsors, and show their logos on your pages.",
    path: "Sponsors & Fundraising → Sponsors",
    steps: [
      { text: "Open Sponsors in the Sponsors & Fundraising group." },
      {
        text: "Add a sponsorship level with a name, price and what the sponsor receives.",
        image: shotSponsors,
        imageCaption: "The Sponsors screen.",
      },
      { text: "Add a sponsor, upload their logo, and mark them paid or send them a payment link." },
      { text: "Their logo then appears on your event page and leaderboard." },
    ],
  },
  {
    key: "public-page",
    title: "Edit your public event page",
    category: "Your Event Page",
    summary: "Change your hero image, colors, text, and what visitors see on your tournament page.",
    path: "Content & Media → Public Page Editor",
    steps: [
      { text: "Open Public Page Editor in the Content & Media group." },
      {
        text: "Update your logo, hero image, colors and event description, then save.",
        image: shotPageEditor,
        imageCaption: "The page editor.",
      },
      { text: "Click View Live Tournament Page to see exactly what players see." },
    ],
  },
  {
    key: "printables",
    title: "Print scorecards, cart signs and hole signs",
    category: "Day Of",
    summary: "Generate print-ready PDFs for your event day.",
    path: "Players & Pairings → Printables",
    steps: [
      { text: "Open Printables in the Players & Pairings group." },
      {
        text: "Choose what to print — scorecards, cart signs, hole signs, check-in sheets.",
        image: shotPrintables,
        imageCaption: "The Printables screen.",
      },
      { text: "Review the preview and download the PDF." },
    ],
    tips: ["Finish your pairings first so names and hole assignments print correctly."],
  },
];

export const ADMIN_GUIDE_CATEGORIES = Array.from(
  new Set(ADMIN_GUIDES.map((g) => g.category)),
);
