// Default budget line items organized into spreadsheet-style sections.
// Used to seed a brand-new budget the first time it's opened.

export const EXPENSE_CATEGORIES = [
  "Facility",
  "Signage",
  "Food & Beverage",
  "Publicity",
  "Player Gifts & Prizes",
  "Misc",
] as const;

export const INCOME_CATEGORIES = [
  "Registrations",
  "Sponsorships",
  "Add-ons & Extras",
  "Donations",
  "Misc Income",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export type DefaultExpense = { item_name: string; category: ExpenseCategory };
export type DefaultIncome = { item_name: string; category: IncomeCategory };
export type DefaultEstimate = { item_name: string; sponsorable?: boolean };

// ---- Expenses (matches the "Expense Details" screenshots) ----
export const DEFAULT_EXPENSES: DefaultExpense[] = [
  // Facility
  { item_name: "Greens fees", category: "Facility" },
  { item_name: "Cart fees", category: "Facility" },
  { item_name: "Driving range", category: "Facility" },
  { item_name: "Tables / chairs", category: "Facility" },
  { item_name: "AV equipment", category: "Facility" },
  { item_name: "Other fees", category: "Facility" },
  // Signage
  { item_name: "Hole sponsor signage", category: "Signage" },
  { item_name: "Hole-in-one signage", category: "Signage" },
  { item_name: "Contest signage", category: "Signage" },
  { item_name: "Informational signage", category: "Signage" },
  { item_name: "Sponsor banner", category: "Signage" },
  { item_name: "Welcome banner / signage", category: "Signage" },
  { item_name: "Navigational signage", category: "Signage" },
  { item_name: "Branded tablecloth", category: "Signage" },
  // Food & Beverage
  { item_name: "Food", category: "Food & Beverage" },
  { item_name: "Drinks / drink tickets", category: "Food & Beverage" },
  { item_name: "Gratuity", category: "Food & Beverage" },
  // Publicity
  { item_name: "Tournament event website", category: "Publicity" },
  { item_name: "Email campaigns", category: "Publicity" },
  { item_name: "Social media ads", category: "Publicity" },
  { item_name: "Radio ads", category: "Publicity" },
  { item_name: "TV ads", category: "Publicity" },
  { item_name: "Printing", category: "Publicity" },
  { item_name: "Postage", category: "Publicity" },
  // Player gifts & prizes
  { item_name: "Trophies / plaques", category: "Player Gifts & Prizes" },
  { item_name: "Swag bags", category: "Player Gifts & Prizes" },
  { item_name: "Volunteer thank yous", category: "Player Gifts & Prizes" },
  { item_name: "Pin prizes", category: "Player Gifts & Prizes" },
  // Misc
  { item_name: "Hole-in-one insurance", category: "Misc" },
  { item_name: "Pin flags", category: "Misc" },
  { item_name: "On-course contest", category: "Misc" },
  { item_name: "Technology / platform fees", category: "Misc" },
];

// ---- Income (matches the "Income Details" screenshots) ----
export const DEFAULT_INCOME: DefaultIncome[] = [
  // Registrations
  { item_name: "Team", category: "Registrations" },
  { item_name: "Sponsor teams", category: "Registrations" },
  // Sponsorships
  { item_name: "Title sponsor", category: "Sponsorships" },
  { item_name: "Technology sponsor", category: "Sponsorships" },
  { item_name: "Hole sponsor", category: "Sponsorships" },
  { item_name: "Hole-in-one contest sponsor", category: "Sponsorships" },
  { item_name: "Other contest sponsor", category: "Sponsorships" },
  { item_name: "Beverage cart sponsor", category: "Sponsorships" },
  { item_name: "Lunch sponsor", category: "Sponsorships" },
  { item_name: "Pin prize sponsor", category: "Sponsorships" },
  { item_name: "Pin flag sponsor", category: "Sponsorships" },
  { item_name: "Player gift sponsor", category: "Sponsorships" },
  { item_name: "Drink sponsor", category: "Sponsorships" },
  // Add-ons & extras
  { item_name: "Mulligans", category: "Add-ons & Extras" },
  { item_name: "Raffle tickets", category: "Add-ons & Extras" },
  { item_name: "All-in games package", category: "Add-ons & Extras" },
  { item_name: "Individual games", category: "Add-ons & Extras" },
  { item_name: "Silent auction", category: "Add-ons & Extras" },
  { item_name: "Live auction", category: "Add-ons & Extras" },
  // Donations
  { item_name: "Event website donations", category: "Donations" },
  { item_name: "Donation station", category: "Donations" },
];

// ---- Vendor estimates scratchpad ----
export const DEFAULT_ESTIMATES: DefaultEstimate[] = [
  { item_name: "Golf facility" },
  { item_name: "Signage", sponsorable: true },
  { item_name: "Banners", sponsorable: true },
  { item_name: "Tablecloth", sponsorable: true },
  { item_name: "Food and beverage", sponsorable: true },
  { item_name: "Email services" },
  { item_name: "Social media ads", sponsorable: true },
  { item_name: "TV ads", sponsorable: true },
  { item_name: "Radio ads", sponsorable: true },
  { item_name: "Printing", sponsorable: true },
  { item_name: "Trophies / plaques", sponsorable: true },
  { item_name: "Swag bag item 1", sponsorable: true },
  { item_name: "Swag bag item 2", sponsorable: true },
  { item_name: "Swag bag item 3", sponsorable: true },
  { item_name: "Swag bag item 4", sponsorable: true },
  { item_name: "Volunteer thank yous" },
  { item_name: "Pin prize 1", sponsorable: true },
  { item_name: "Pin prize 2", sponsorable: true },
  { item_name: "Pin prize 3", sponsorable: true },
  { item_name: "Pin prize 4", sponsorable: true },
  { item_name: "On-course entertainment", sponsorable: true },
  { item_name: "Hole-in-one insurance", sponsorable: true },
];

// Back-compat (Budget.tsx old API)
export function getDefaultExpenses(_format?: string | null): DefaultExpense[] {
  return DEFAULT_EXPENSES;
}
export function getDefaultIncome(_format?: string | null): DefaultIncome[] {
  return DEFAULT_INCOME;
}
