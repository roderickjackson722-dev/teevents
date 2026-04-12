export const sampleTournamentFull = {
  id: "demo-tournament-001",
  name: "Pebble Beach Charity Classic",
  date: "June 15, 2026",
  location: "Pebble Beach Golf Links, Pebble Beach, CA",
  registration_fee: 150,
  fee_model: "pass_to_golfer",
  max_players: 72,
  current_registrations: 54,
  description: "Join us for a day of golf supporting local youth programs. Includes breakfast, lunch, and awards dinner.",
  status: "Live",
  registration_close_date: "June 10, 2026",
};

export const samplePlayers = [
  { first_name: "John", last_name: "Smith", email: "john.smith@example.com", phone: "(555) 123-4567", handicap: 12, shirt_size: "Large", dietary: "None", date: "2026-03-15", status: "Paid", amount: 150 },
  { first_name: "Sarah", last_name: "Jones", email: "sarah.jones@example.com", phone: "(555) 234-5678", handicap: 8, shirt_size: "Medium", dietary: "Vegetarian", date: "2026-03-16", status: "Paid", amount: 150 },
  { first_name: "Michael", last_name: "Brown", email: "michael.brown@example.com", phone: "(555) 345-6789", handicap: 18, shirt_size: "XL", dietary: "None", date: "2026-03-18", status: "Paid", amount: 150 },
  { first_name: "Emily", last_name: "Davis", email: "emily.davis@example.com", phone: "(555) 456-7890", handicap: 15, shirt_size: "Small", dietary: "Gluten Free", date: "2026-03-20", status: "Paid", amount: 150 },
  { first_name: "David", last_name: "Wilson", email: "david.wilson@example.com", phone: "(555) 567-8901", handicap: 5, shirt_size: "Large", dietary: "None", date: "2026-03-22", status: "Paid", amount: 150 },
  { first_name: "Lisa", last_name: "Taylor", email: "lisa.taylor@example.com", phone: "(555) 678-9012", handicap: 10, shirt_size: "Medium", dietary: "None", date: "2026-03-25", status: "Paid", amount: 150 },
  { first_name: "Robert", last_name: "Anderson", email: "robert.anderson@example.com", phone: "(555) 789-0123", handicap: 14, shirt_size: "XL", dietary: "Shellfish Allergy", date: "2026-03-28", status: "Paid", amount: 150 },
  { first_name: "Jennifer", last_name: "Martinez", email: "jennifer.martinez@example.com", phone: "(555) 890-1234", handicap: 9, shirt_size: "Small", dietary: "None", date: "2026-03-30", status: "Paid", amount: 150 },
  { first_name: "Thomas", last_name: "Garcia", email: "thomas.garcia@example.com", phone: "(555) 901-2345", handicap: 6, shirt_size: "Large", dietary: "None", date: "2026-04-01", status: "Paid", amount: 150 },
  { first_name: "Patricia", last_name: "Rodriguez", email: "patricia.rodriguez@example.com", phone: "(555) 012-3456", handicap: 11, shirt_size: "Medium", dietary: "Vegan", date: "2026-04-02", status: "Paid", amount: 150 },
  { first_name: "Charles", last_name: "Miller", email: "charles.miller@example.com", phone: "(555) 123-4567", handicap: 16, shirt_size: "XL", dietary: "None", date: "2026-04-03", status: "Paid", amount: 150 },
  { first_name: "Barbara", last_name: "Wilson", email: "barbara.wilson@example.com", phone: "(555) 234-5678", handicap: 7, shirt_size: "Small", dietary: "None", date: "2026-04-04", status: "Paid", amount: 150 },
];

export const sampleDashboardFinances = {
  total_collected: 8100,
  platform_fees: 270,
  pending_hold: 1215,
  available_balance: 6615,
  next_payout_date: "June 30, 2026",
};

export const sampleDashboardTransactions = [
  { date: "2026-03-15", golfer: "John Smith", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
  { date: "2026-03-16", golfer: "Sarah Jones", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
  { date: "2026-03-18", golfer: "Michael Brown", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
  { date: "2026-03-20", golfer: "Emily Davis", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
  { date: "2026-03-22", golfer: "David Wilson", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Released" },
  { date: "2026-03-25", golfer: "Lisa Taylor", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Released" },
  { date: "2026-03-28", golfer: "Robert Anderson", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
  { date: "2026-03-30", golfer: "Jennifer Martinez", gross: 150, fee: 5, hold: 21.75, net: 123.25, status: "Held" },
];

export const samplePayouts = [
  { date: "2026-04-01", amount: 1440, method: "Stripe Connect", batchId: "BATCH-001", status: "Completed", transactions: 12 },
  { date: "2026-03-15", amount: 1200, method: "Stripe Connect", batchId: "BATCH-000", status: "Completed", transactions: 10 },
];

export const sampleSponsorsDetailed = [
  { name: "First National Bank", level: "Platinum", amount: 5000, status: "Paid", logo: "https://placehold.co/200x100/1a365d/ffffff?text=First+National" },
  { name: "Coastal Realty Group", level: "Gold", amount: 2500, status: "Paid", logo: "https://placehold.co/200x100/2d6a4f/ffffff?text=Coastal+Realty" },
  { name: "Bay Area Auto", level: "Gold", amount: 2500, status: "Invoiced", logo: "https://placehold.co/200x100/7c3aed/ffffff?text=Bay+Area+Auto" },
  { name: "Pacific Insurance", level: "Silver", amount: 1000, status: "Paid", logo: "https://placehold.co/200x100/dc2626/ffffff?text=Pacific+Ins" },
  { name: "Monterey Wines", level: "Bronze", amount: 500, status: "Paid", logo: "https://placehold.co/200x100/b45309/ffffff?text=Monterey+Wines" },
  { name: "Ocean View Dental", level: "Bronze", amount: 500, status: "Pending", logo: "https://placehold.co/200x100/0d9488/ffffff?text=Ocean+View" },
];

export const sampleVolunteersDetailed = [
  { name: "Mike Thompson", email: "mike@example.com", role: "Check-in Desk", shift: "7:00 AM – 10:00 AM", status: "Confirmed" },
  { name: "Amy Chen", email: "amy@example.com", role: "Check-in Desk", shift: "7:00 AM – 10:00 AM", status: "Confirmed" },
  { name: "Carlos Rivera", email: "carlos@example.com", role: "Beverage Cart", shift: "9:00 AM – 2:00 PM", status: "Confirmed" },
  { name: "Diana Park", email: "diana@example.com", role: "Scoring Tent", shift: "11:00 AM – 3:00 PM", status: "Confirmed" },
  { name: "Eric Johnson", email: "eric@example.com", role: "Scoring Tent", shift: "11:00 AM – 3:00 PM", status: "Confirmed" },
  { name: "Fiona Walsh", email: "fiona@example.com", role: "Scoring Tent", shift: "11:00 AM – 3:00 PM", status: "Pending" },
  { name: "Greg Yamada", email: "greg@example.com", role: "Photography", shift: "8:00 AM – 4:00 PM", status: "Confirmed" },
];

export const sampleMessages = [
  { subject: "Welcome to the Pebble Beach Charity Classic!", sent: "2026-03-01", recipients: 54, status: "Sent" },
  { subject: "Tournament Day Reminder – What to Bring", sent: "2026-06-12", recipients: 54, status: "Scheduled" },
  { subject: "Sponsor Thank You & Event Photos", sent: "2026-06-16", recipients: 60, status: "Draft" },
];
