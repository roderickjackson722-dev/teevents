# TeeVents — Sales Demo Feature Guide & Video Script

## Overview
TeeVents is the all-in-one golf tournament management platform. This document outlines every feature for your sales demo video and screenshots.

---

## 🎬 Recommended Demo Flow (Video Script Order)

### 1. OPENING — The Problem (30 sec)
**Talk Track:** "Managing a golf tournament today means juggling spreadsheets, email, separate payment processors, and manual check-in. There's no single platform built specifically for golf tournament organizers — until now."

**Screenshot:** Show landing page hero section at `/`

---

### 2. PLATFORM OVERVIEW (1 min)
**Talk Track:** "TeeVents gives organizers everything they need in one dashboard — from creating a branded tournament website to live scoring on game day."

**Screenshots:**
- `/platform` — Show the 4-tier pricing section
- `/dashboard` — Show the main dashboard overview

---

### 3. TOURNAMENT WEBSITE BUILDER (1.5 min)
**Talk Track:** "Create a professional tournament website in minutes. Choose from 3 templates — Classic Green, Modern Navy, or Charity Warmth — customize your branding, and publish with one click."

**Demo Path:** `/dashboard/tournaments/{id}/site-builder`
**Screenshots:**
- Template selection
- Color/branding customization
- Published site preview at `/t/{slug}`
- Mobile responsive view
- Show the 8 navigation tabs: Home, Contests, Registration, Photos, Location, Agenda, Donation, Contact

---

### 4. ONLINE REGISTRATION & PAYMENTS (1.5 min)
**Talk Track:** "Accept registrations and payments online with Stripe Connect. Players get instant email confirmations, and you track everything in real-time."

**Demo Path:** `/dashboard/players` (Roster view)
**Key Points:**
- Player roster with search and filtering
- Add player manually via dialog
- **NEW: Import players** via CSV upload or paste from spreadsheet
- Export roster to CSV
- Payment status tracking (Paid, Pending, Comp)
- Public registration form on tournament website

**Screenshots:**
- Player roster table
- Add player dialog
- Import players dialog (CSV + paste tabs)
- Public registration form on `/t/{slug}`

---

### 5. PLAYER PAIRINGS & GROUPS (1 min)
**Talk Track:** "Drag and drop players into foursomes, or let our auto-assign algorithm do it for you. Create groups, manage positions, and export pairings."

**Demo Path:** `/dashboard/players` (Pairings view)
**Screenshots:**
- Pairings drag-and-drop interface
- Unassigned players pool
- Group cards with player positions
- Auto-assign button

---

### 6. LIVE SCORING & LEADERBOARD (1.5 min)
**Talk Track:** "On tournament day, print scorecards with embedded QR codes. Players simply scan the code with their phone and get instant access to their group's scoring page — no login required. They enter scores hole by hole, and the leaderboard updates live."

**Demo Paths:**
- `/dashboard/leaderboard` — Admin scoring & leaderboard view
- `/t/{slug}/scoring` — Player-facing scoring page
- `/dashboard/printables` → Scorecards tab — Show QR code generation

**Key Points:**
- **Scoring QR Codes** printed on scorecards for instant player access
- Print QR codes on scorecards from the Printables tab
- Admin can regenerate all codes for security/reassignments
- Players scan code → instant group access (no login)
- 18-hole scorecard input per player
- Real-time leaderboard with sponsor rotations
- Alternative: players can still manually enter group number or email

**Screenshots:**
- Scorecard with embedded QR code
- Admin leaderboard with scoring grid
- Printables page showing QR code toggle
- Player scanning QR code on mobile
- Player scoring interface with group auto-loaded

---

### 7. QR CODE CHECK-IN (1 min)
**Talk Track:** "Print QR codes for every player. On event day, open the Scan Station on any tablet or phone, scan QR codes, and watch check-in numbers update in real-time."

**Demo Paths:**
- `/dashboard/check-in` — Admin check-in management
- `/checkin/{tournamentId}` — Dedicated scan station

**Key Points:**
- Print all QR codes (printable HTML page)
- **Open Scan Station** — dedicated full-page scan interface
- Manual search and check-in fallback
- Real-time checked-in counter
- Undo check-in capability

**Screenshots:**
- Check-in dashboard with stats
- Scan station page
- Player card with QR code
- Checked-in confirmation

---

### 8. SPONSOR MANAGEMENT (45 sec)
**Talk Track:** "Track sponsors by tier — Title, Gold, Silver, Bronze — manage payments, and automatically display logos on your tournament website."

**Demo Path:** `/dashboard/sponsors`
**Screenshots:**
- Sponsor list with tiers
- Add sponsor dialog
- Sponsors section on public site

---

### 9. BUDGET TRACKING (45 sec)
**Talk Track:** "Keep your tournament finances organized. Track income and expenses by category, mark items as paid, and see your budget health at a glance."

**Demo Path:** `/dashboard/budget`
**Screenshots:**
- Budget overview with totals
- Income vs expense breakdown
- Category-based line items

---

### 10. EMAIL & SMS MESSAGING (1 min)
**Talk Track:** "Communicate with your entire field in seconds. Send email blasts or SMS texts, schedule messages in advance, and track delivery."

**Demo Path:** `/dashboard/messages`
**Key Points:**
- Email and SMS messaging
- Scheduled message delivery
- Recipient count tracking
- Message history

---

### 11. ADVANCED FEATURES (1.5 min)
**Talk Track:** "Pro and Enterprise plans unlock powerful tools to maximize your event's impact."

**Merchandise Store** (`/dashboard/store`)
- Create products with images and prices
- Public storefront on tournament website
- Stripe checkout integration

**Auction & Raffle** (`/dashboard/auction`)
- Silent auction items with bidding
- Raffle with ticket pricing
- Buy Now option
- Winner tracking

**Photo Gallery** (`/dashboard/gallery`)
- Upload event photos
- Public gallery on tournament website
- Captions and ordering

**Donations** (`/dashboard/donations`)
- Donation page with progress bar
- Configurable fundraising goal
- Stripe payment processing

**Surveys** (`/dashboard/surveys`)
- Post-event survey builder
- Rating, text, and multiple choice questions
- Response analytics

**Volunteer Coordination** (`/dashboard/volunteers`)
- Define volunteer roles with time slots
- Track signups and capacity
- Public volunteer signup form

---

### 12. PLANNING GUIDE (30 sec)
**Talk Track:** "Every new tournament gets a 30-item checklist organized by timeline — from 12 months out to post-event. Never miss a detail."

**Demo Path:** `/dashboard/checklist`
**Screenshots:**
- Checklist grouped by timeline
- Completed vs pending items

---

### 13. PRICING & PLANS (1 min)
**Talk Track:** "Start free with our Base plan. As your tournament grows, upgrade to unlock more features and lower your transaction fees."

**Demo Path:** `/dashboard/upgrade`
**Screenshots:**
- 4-tier pricing grid
- Current plan indicator
- Upgrade CTA buttons
- Promo code input

| Plan | Price | Fee | Key Features |
|------|-------|-----|-------------|
| Base | Free | 5% | 1 tournament, registration, website (1 template), leaderboard |
| Starter | $499 | 3% | All templates, sponsors, budget, donations, SMS (500) |
| Pro | $999 | 2% | Store, auction, surveys, volunteers, priority support |
| Enterprise | Custom | 1% | Unlimited tournaments, unlimited SMS, white-label, API |

---

### 14. CLOSING — Call to Action (30 sec)
**Talk Track:** "TeeVents takes the complexity out of tournament management. Start free today and see the difference an all-in-one platform makes."

**Screenshot:** Show CTA section or `/get-started` page

---

## 📸 Screenshot Checklist

1. ☐ Landing page hero (`/`)
2. ☐ Platform pricing section (`/platform`)
3. ☐ Customer dashboard home (`/dashboard`)
4. ☐ Site Builder with template preview
5. ☐ Published tournament site (`/t/{slug}`)
6. ☐ Player roster table
7. ☐ Import players dialog
8. ☐ Pairings drag-and-drop view
9. ☐ Admin leaderboard & scoring
10. ☐ Player-facing scoring login
11. ☐ Player scoring scorecard
12. ☐ Check-in dashboard
13. ☐ Scan station page
14. ☐ Sponsor management
15. ☐ Budget tracking
16. ☐ Messaging center
17. ☐ Merchandise store
18. ☐ Auction management
19. ☐ Photo gallery
20. ☐ Donation page with progress bar
21. ☐ Survey builder
22. ☐ Volunteer roles
23. ☐ Planning guide checklist
24. ☐ Upgrade plan page (`/dashboard/upgrade`)
25. ☐ Mobile responsive views (registration, scoring, check-in)

---

## 🎯 Key Selling Points to Emphasize

1. **Free to start** — Base plan costs nothing, 5% transaction fee only
2. **All-in-one** — No more juggling 10+ tools
3. **Organizers keep control** — Stripe Connect means they manage their own payments
4. **Mobile-first** — Scoring, check-in, and registration all work on phones
5. **Scale when ready** — Upgrade path from free to enterprise
6. **Purpose-built for golf** — Not a generic event platform
