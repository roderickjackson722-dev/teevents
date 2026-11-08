/**
 * Preloaded text templates for the organizer dashboard's Event Details and
 * Content sections. Templates are text only — choosing one fills the field it
 * belongs to and never touches prices, fees, payment settings, or any other
 * field. [brackets] are placeholders the organizer replaces by hand.
 */

export interface TextTemplate {
  id: string;
  label: string;
  /** Short hint shown next to the label (e.g. a price). */
  detail?: string;
  text: string;
}

/** Convert plain template text to simple HTML for the rich text editors. */
export function templateTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

/** True when a rich-text HTML value actually contains visible text. */
export function htmlHasContent(html: string): boolean {
  if (!html) return false;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").trim().length > 0;
}

export const EVENT_DESCRIPTION_TEMPLATES: TextTemplate[] = [
  {
    id: "charity",
    label: "Charity Fundraiser",
    text: "Join us for the [Event Name] at [Course Name] on [Date]. This [scramble / tournament format] brings golfers together to support [Organization and cause]. Your entry includes [18 holes with cart, range balls, lunch, and awards reception]. Every dollar raised goes toward [cause]. Come play a great round for a great cause.",
  },
  {
    id: "corporate",
    label: "Corporate Outing",
    text: "You are invited to the [Event Name] at [Course Name] on [Date]. Join [Company Name] for a day of golf, networking, and friendly competition. Your entry includes [18 holes with cart, lunch, and prizes]. Whether you play every week or once a year, this is a day to enjoy the course with colleagues and clients.",
  },
  {
    id: "competitive",
    label: "Competitive Tournament",
    text: "The [Event Name] returns to [Course Name] on [Date]. This [stroke play / scramble] tournament features [number] players competing for [prizes / title]. Entry includes [18 holes with cart, range balls, and awards]. Register early, spots are limited.",
  },
];

export const SCHEDULE_TEMPLATES: TextTemplate[] = [
  {
    id: "classic-day",
    label: "Classic tournament day",
    text: "7:00 AM - Registration and check-in open, driving range open.\n7:30 AM - Warm up and putting green open.\n8:00 AM - Shotgun start.\n12:30 PM - Lunch.\n1:00 PM - Awards ceremony and raffle.\n2:00 PM - Event concludes.",
  },
];

export const REGISTRATION_INTRO_TEMPLATES: TextTemplate[] = [
  {
    id: "welcome",
    label: "Welcome golfers",
    text: "Welcome, golfers! Register below to secure your spot in the [Event Name] at [Course Name] on [Date]. Your entry includes [18 holes with cart, range balls, lunch, and entry into contests and prizes]. Please add each player on your team during checkout. If you have any questions, contact us at [email]. We look forward to seeing you on the course!",
  },
];

export const PROMO_TEMPLATES: TextTemplate[] = [
  {
    id: "short-blurb",
    label: "Short blurb",
    text: "Tee off for a great cause at the [Event Name]! Join us [Date] at [Course Name] for [18 holes, lunch, contests, and prizes], all supporting [cause]. Spots are limited, register today.",
  },
  {
    id: "social-post",
    label: "Social post",
    text: "Save the date! The [Event Name] is [Date] at [Course Name]. Golf, lunch, prizes, and a great cause, all in one day. Link in bio to register. [Hashtags]",
  },
];

export interface SponsorTierTemplate {
  id: string;
  label: string;
  price: string;
  benefits: string;
}

export const SPONSOR_TIER_TEMPLATES: SponsorTierTemplate[] = [
  {
    id: "presenting",
    label: "Presenting Sponsor",
    price: "5000",
    benefits: "Logo on the event page, leaderboard, and all printed materials. Speaking slot at the awards ceremony. One complimentary foursome. Social media recognition.",
  },
  {
    id: "gold",
    label: "Gold Sponsor",
    price: "3500",
    benefits: "Logo on the event page and leaderboard. One complimentary foursome. Social media recognition.",
  },
  {
    id: "silver",
    label: "Silver Sponsor",
    price: "2500",
    benefits: "Logo on the event page. Two complimentary player entries. Social media recognition.",
  },
  {
    id: "hole",
    label: "Hole Sponsor",
    price: "500",
    benefits: "Signage at one hole. Logo on the event page.",
  },
];

export const DONATION_INTRO_TEMPLATE: TextTemplate = {
  id: "donation-intro",
  label: "Can not make it?",
  text: "Can not make it to the course? You can still support [cause]. Every donation goes directly to [Organization]. Thank you for helping us reach our goal.",
};

export const DONATION_SUGGESTED_AMOUNTS = "25, 50, 100, 250";

export const AUCTION_ITEM_TEMPLATES: TextTemplate[] = [
  {
    id: "auction-item",
    label: "Auction item",
    text: "Item: [Item name]. Description: [What it is, and what makes it special]. Value: $[value]. Starting bid: $[amount]. Donated by: [Donor name].",
  },
];
