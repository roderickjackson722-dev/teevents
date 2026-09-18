# Enterprise Section for TeeVents

A separate, simplified dashboard at `/enterprise` for golf courses, clubs and organizations running many events per year. Same brand (forest green, gold, white), far fewer clicks than the standard organizer dashboard.

Because this is a large build, it ships in four passes. Each pass leaves the section usable end to end, so you can review and redirect before the next one starts.

## Foundation decisions

- Enterprise events are ordinary TeeVents events with an `is_enterprise` flag plus an `event_type` (single round, multi-round, Ryder Cup, match bracket, round robin). That means scoring, leaderboards, live TV display, skins, printables, registration and payouts all keep working exactly as they do today — the Enterprise section is a cleaner front end over the same data, not a second system.
- Everything is scoped to the organization. Existing staff roles and permissions carry over, so multiple staff can work under one enterprise account with the access levels already defined.
- Leagues reuse the existing league tables and league management screens, surfaced inside the Enterprise shell.

## Pass 1 — Shell, home list, event management

- Enterprise layout: left sidebar (Dashboard; Create; Manage: Leagues, My Courses, My Roster, Communications, Automations; Resources: Partners, What's New, Feedback, Earn $300; Admin Portal for platform admins only), breadcrumbs, mobile drawer.
- Top tabs: Single Round, Multi-Round, Ryder Cup, Match Bracket, Round Robin.
- Event list: name, status (Draft / Ready / In Progress / Complete), date, course, player count, format. Filter control, pagination, and a three-dot menu per event with Edit Event Info, Edit Teams, Edit Pairings/Handicaps, Edit Tees, Edit Scores, Flights & Status, Skins/Deuces/Putts, Hole-by-Hole Settings, Print Scorecards & Reports, Send Email, Post Scores, Update Payouts & Points, Duplicate, Delete.
- Duplicate clones settings, player list and configuration into a new Draft event.
- My Courses (saved courses and tee sets) and My Roster (reusable club member list with handicap, email, phone).

## Pass 2 — Create wizard and players

- Five-screen wizard with Back/Next, auto-save of a draft, inline validation and tooltips.
  1. Event Info: name, course, 9/18 holes toggle, date and time, and multiple rounds on the same day or across days ("Round 1 — Morning").
  2. Player Details: players per team (1–4), game type (stroke play, scramble, best ball, alternate shot, Stableford, match play and the rest of the existing formats), skins (gross/net), deuces (gross/net), per-player handicap allowance, collapsible Advanced Options.
  3. Add Players: from My Roster, manual entry, or spreadsheet import, plus Add TBD Player; roster list shows name, handicap, team.
  4. Pairings & Groups: Auto-Assign (by handicap or random), Add Empty Group, players per pairing (2–4), groups per hole, A/B/C group letters per hole, drag-and-drop between groups, Confirm.
  5. Complete: review summary and Publish.
- Spreadsheet import: upload CSV/Excel, map columns (required First and Last Name; optional GHIN, handicap index, email, team name, starting hole, tee set), preview of the first five rows, blank-line handling (ignore or create TBD players), Import Data.

## Pass 3 — Registration page and leaderboard/scoring settings

- Public registration page on a shareable link with copyable URL and QR code: event name and date, email, name, handicap via GHIN or manual entry, GHIN ID, organizer-defined custom questions (text, multiple choice, tee-time preference), Add Player for team sign-ups, close date and time, maximum players, and toggles for Require Full Team, Require GHIN, Allow Waitlist, Hide Registered Players. Free or paid registration, with Stripe connection for paid events.
- Leaderboard & Scoring settings panel: handicap allowance per player position, max course handicap and differential, start-at-handicap/quota toggle, leaderboard display toggles (first and last names, flight under team name, hide scorecards, hide dues, hide leaderboard, total score instead of to par, codeless scoring), visible gross/net, sponsor image upload, rules sheet link.
- TV settings: speed and size sliders, background image, always show leader on top, gross/net switching, show skins, flight switching, and the TV URL.
- Event options: information banner, "Take It" scoring, max hole score, specific holes 1–18, best holes (all / front 9 / back 9).

## Pass 4 — Printables, skins and leagues

- Scorecard templates: Standard Stroke Play, Scramble, Best Ball, Alternate Shot, Stableford, 2-Player Scramble, Individual Stroke Play with Marker, 6-6-6. Every card carries a QR code and the scoring sign-in web address, circles birdie scores, and can show a skins section listing skins holes with the winning score and winner's name. Colors, rows and layout are editable per event.
- Print set: Scorecards, Cart Signs, Alpha List, Name Badge List.
- Skins & Deuces panel wired to the existing skins engine: choose which players are in the game, track by hole, show winning score and player name per skin hole, gross and net, plus deuces.
- Leagues: create and manage leagues, season dates, standings across events, assign players, league leaderboards — reusing the current league screens inside the Enterprise shell.

## Technical notes

- Migration adds `is_enterprise`, `event_type` and an enterprise settings JSON column to `tournaments`, plus `enterprise_roster` (club member roster) and saved-course rows; every table gets GRANTs and organization-scoped RLS policies.
- New reusable components: enterprise layout/sidebar, event list with action menu, wizard steps, pairings drag-and-drop board, spreadsheet mapper, scorecard template renderer.
- Existing organizer dashboard, public event pages and admin tools are untouched; the standard flow keeps working exactly as it does now.

## What is not included

- No changes to pricing, fees or payout behavior.
- No changes to any Arlington County RFP module.
