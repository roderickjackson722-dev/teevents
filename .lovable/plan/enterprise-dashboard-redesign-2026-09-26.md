# Enterprise dashboard redesign

## Goal
Replace the current top-menu Enterprise workspace with a distinct TeeVents sidebar experience, a stats-first home dashboard, a unified event list, and event-type selection inside the creation wizard. Preserve existing Enterprise data, permissions, event actions, scoring, registration, and publishing behavior.

## Build

### 1. Enterprise shell and navigation
- Rebuild the shared Enterprise layout as a fixed dark-green desktop sidebar with a mobile drawer.
- Use the requested groups and order: Dashboard, Manage, Create, Resources, Admin.
- Add Home, Tournaments, Leagues, My Courses, My Roster, Communications, Automations, New Tournament, New League, Partners, What's New, Feedback, Earn $300, and Admin Portal.
- Remove Single Tournament, Multi-Round, Ryder Cup, Bracket, and Round Robin from navigation; those choices move into the tournament wizard.
- Preserve existing staff-role restrictions so limited users do not gain access to management/admin tools.
- Replace the placeholder emblem with the TeeVents logo and wordmark, add the gold ENTERPRISE label, retain organization initials, and keep page-aware breadcrumbs.

### 2. Stats-first Enterprise home
- Move four summary cards to the top: Upcoming Events, Active Events, Completed Events, and Revenue This Year.
- Calculate event counts from the organization’s Enterprise tournaments and leagues; calculate yearly revenue from successful organization transactions already available to the signed-in club.
- Add Quick Actions for New Tournament, New League, and View Reports.
- Replace event-type tabs with one recent-events feed containing both tournaments and leagues.
- Add filters for All, Tournaments, Leagues, Drafts, and Completed, plus search.
- Show each row/card with type, name, date/course, format/holes, player count, status, and the existing three-dot actions where applicable.
- Use the requested empty state and New Tournament action.

### 3. Dedicated management destinations
- Add a Tournaments destination for the organization’s Enterprise tournaments without restoring event-type tabs.
- Keep the existing Leagues management page, and make New League open its existing creation form directly.
- Keep all current event edit, duplicate, delete, scoring, registration, print, communication, and public-page links working.

### 4. Tournament creation wizard
- Put Single Round, Multi-Round, Ryder Cup, Match Bracket, and Round Robin selectors at the top of the wizard.
- Convert the current flow to four visible steps: Event Details, Players, Pairings, Review & Publish, while retaining all existing fields and save/publish behavior.
- Start New Tournament without preselecting a type from the dashboard; editing an existing event restores its saved type.

### 5. TeeVents visual system and verification
- Add scoped semantic Enterprise tokens for dark green `#1a3a2a`, gold `#d4a843`, cream `#faf8f3`, and dark gray `#2d2d2d`.
- Use Playfair Display for Enterprise headings and Inter for Enterprise labels/body; primary actions are gold, secondary actions use a green outline, and statuses use gray/green/gold.
- Verify desktop and mobile navigation, home filters/search, empty and populated states, both creation actions, wizard type selection, and existing event action menus in the browser.
- Confirm the preview builds cleanly and does not expose any private RFP functionality.

## Scope
No database schema, pricing, public pages, organizer dashboard, payment routing, RFP visibility, or non-Enterprise behavior will be changed.
