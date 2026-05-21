// Default budget line items by tournament scoring format.
// Used to seed a brand-new budget the first time it's opened.

export type DefaultExpense = {
  item_name: string;
  category: "Venue" | "Staff" | "Equipment" | "Marketing" | "Travel" | "Food" | "Insurance" | "Prizes" | "Other";
};

export type DefaultIncome = {
  item_name: string;
  category: "Registration" | "Sponsorship" | "Merchandise" | "Food & Beverage" | "Donation" | "Other";
};

const BASE_EXPENSES: DefaultExpense[] = [
  { item_name: "Greens Fees", category: "Venue" },
  { item_name: "Cart Rentals", category: "Equipment" },
  { item_name: "Range Balls (practice)", category: "Equipment" },
  { item_name: "Course Maintenance Fee", category: "Venue" },
  { item_name: "Insurance", category: "Insurance" },
  { item_name: "Marketing & Advertising", category: "Marketing" },
  { item_name: "Printed Materials (scorecards, signs)", category: "Marketing" },
  { item_name: "Photography / Videography", category: "Marketing" },
  { item_name: "Staff Stipends / Payroll", category: "Staff" },
  { item_name: "First Aid / Medical Supplies", category: "Other" },
  { item_name: "Hole Sponsor Signs", category: "Marketing" },
  { item_name: "Prize Fund / Trophies", category: "Prizes" },
];

const SCRAMBLE_EXTRA_EXPENSES: DefaultExpense[] = [
  { item_name: "Team Gift Bags", category: "Prizes" },
  { item_name: "On-Course Refreshments", category: "Food" },
  { item_name: "Closest-to-Pin Prizes", category: "Prizes" },
  { item_name: "Long Drive Prizes", category: "Prizes" },
];

const STROKE_EXTRA_EXPENSES: DefaultExpense[] = [
  { item_name: "Individual Scorecards (printed)", category: "Marketing" },
  { item_name: "Rules Officials", category: "Staff" },
  { item_name: "Leaderboard Display", category: "Equipment" },
];

const BASE_INCOME: DefaultIncome[] = [
  { item_name: "Individual Registration Fees", category: "Registration" },
  { item_name: "Team Registration (Foursomes)", category: "Registration" },
  { item_name: "Sponsorships", category: "Sponsorship" },
  { item_name: "Donations", category: "Donation" },
];

const SCRAMBLE_EXTRA_INCOME: DefaultIncome[] = [
  { item_name: "Mulligan Sales", category: "Other" },
  { item_name: "Skins Game Entry", category: "Other" },
  { item_name: "Team Gift Bag Sales", category: "Merchandise" },
];

const STROKE_EXTRA_INCOME: DefaultIncome[] = [
  { item_name: "Practice Round Fees", category: "Registration" },
  { item_name: "Pro Shop Sales", category: "Merchandise" },
  { item_name: "Leaderboard Sponsorship", category: "Sponsorship" },
];

function normalize(format?: string | null): "scramble" | "stroke" | "other" {
  const f = (format || "").toLowerCase();
  if (f.includes("scramble") || f.includes("best ball") || f.includes("bestball")) return "scramble";
  if (f.includes("stroke") || f.includes("match")) return "stroke";
  return "other";
}

export function getDefaultExpenses(format?: string | null): DefaultExpense[] {
  const kind = normalize(format);
  if (kind === "scramble") return [...BASE_EXPENSES, ...SCRAMBLE_EXTRA_EXPENSES];
  if (kind === "stroke") return [...BASE_EXPENSES, ...STROKE_EXTRA_EXPENSES];
  return BASE_EXPENSES;
}

export function getDefaultIncome(format?: string | null): DefaultIncome[] {
  const kind = normalize(format);
  if (kind === "scramble") return [...BASE_INCOME, ...SCRAMBLE_EXTRA_INCOME];
  if (kind === "stroke") return [...BASE_INCOME, ...STROKE_EXTRA_INCOME];
  return BASE_INCOME;
}

export const EXPENSE_CATEGORIES = [
  "Venue", "Staff", "Equipment", "Marketing", "Travel", "Food", "Insurance", "Prizes", "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Registration", "Sponsorship", "Merchandise", "Food & Beverage", "Donation", "Other",
] as const;
