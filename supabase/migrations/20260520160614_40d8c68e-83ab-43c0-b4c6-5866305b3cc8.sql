
INSERT INTO public.outreach_campaigns (name, is_default, delay_days,
  email1_subject, email1_body,
  email2_subject, email2_body,
  email3_subject, email3_body)
VALUES
(
  'Google Forms Sequence', false, 2,
  'Still using Google Forms for {{tournament_name}}?',
  E'Hi {{first_name}},\n\nI saw you''re using Google Forms to manage {{tournament_name}}.\n\nGoogle Forms is great for surveys, but it wasn''t built for golf tournaments — no payments, no leaderboard, no pairings, no sponsor management, and no way to send branded confirmations.\n\nBuilt by golf tournament managers, for golf tournament managers — TeeVents gives you everything in one place, and your registration money goes straight to your own Stripe account (T+2 days standard).\n\nSee it in 2 minutes (no call needed):\n👉 https://teevents.golf/interactive-demo\n\nStart your tournament for free or reserve a demo:\n👉 https://teevents.golf/get-started\n\nBest,\nRod Jackson\nTeeVents Golf',
  'What Google Forms can''t do for your tournament',
  E'Hi {{first_name}},\n\nQuick follow-up — here''s what TeeVents handles that Google Forms can''t:\n\n✅ Secure online payments (Stripe, Apple Pay, Google Pay)\n✅ Auto-pairings (handicap, team, sponsor)\n✅ Live leaderboard you can embed on your website\n✅ Sponsor packages with asset/logo collection\n✅ Volunteer + player check-in via QR\n✅ Automatic payouts to your own bank (T+2 days)\n✅ Custom branded tournament site\n\n...and much more → https://teevents.golf/features\n\nBest,\nRod',
  'Reserve a 15-min demo for {{tournament_name}}',
  E'Hi {{first_name}},\n\nIf Google Forms is getting messy, I''d love to show you a better way in 15 minutes.\n\n👉 https://teevents.golf/book\n\nOr start your tournament free right now — no credit card:\n👉 https://teevents.golf/get-started\n\nBest,\nRod'
),
(
  'GiveButter Sequence', false, 2,
  'GiveButter is great for donations — but for golf?',
  E'Hi {{first_name}},\n\nI noticed you''re running {{tournament_name}} on GiveButter. GiveButter is fantastic for general fundraising, but golf tournaments have a lot of moving pieces it doesn''t cover.\n\nBuilt by golf tournament managers, for golf tournament managers — TeeVents handles:\n\n• Player + team registration with handicap\n• Hole sponsor packages with logo upload\n• Live leaderboard your sponsors can watch\n• Auto-pairings & printable scorecards/cart signs\n• Direct Stripe payouts to your nonprofit''s account (T+2 days)\n• 501(c)(3) tax-receipt friendly\n\nAnd just 5% platform fee — no held funds, no waiting.\n\nSee a 2-min demo:\n👉 https://teevents.golf/interactive-demo\n\nStart for free or reserve a demo:\n👉 https://teevents.golf/get-started\n\nBest,\nRod Jackson\nTeeVents Golf',
  'Pairing GiveButter with TeeVents for golf events',
  E'Hi {{first_name}},\n\nMany nonprofits use GiveButter for year-round giving AND TeeVents for their golf tournament — the two work great side by side.\n\nWith TeeVents you get:\n✅ Tournament-specific registration & sponsor flows\n✅ Live leaderboard + day-of operations\n✅ Funds direct to your Stripe (no holds)\n✅ Tax-receipt friendly for 501(c)(3)s\n\nSee the nonprofit page → https://teevents.golf/nonprofits\n\nBest,\nRod',
  'Want me to set up your tournament site?',
  E'Hi {{first_name}},\n\nHappy to spin up a branded site for {{tournament_name}} so you can see exactly how it would look.\n\nReserve 15 min: https://teevents.golf/book\nOr start free: https://teevents.golf/get-started\n\nBest,\nRod'
),
(
  'No-Website / General Outreach', false, 2,
  'A free tournament website for {{tournament_name}}?',
  E'Hi {{first_name}},\n\nI couldn''t find a website for {{tournament_name}} and wanted to reach out.\n\nTeeVents gives every organizer a free, fully-branded tournament site — registration, sponsors, schedule, leaderboard, the works — in under 10 minutes. No design or tech skills needed.\n\nBuilt by golf tournament managers, for golf tournament managers.\n\n• 5% platform fee, no held funds\n• Direct Stripe payouts to your account (T+2 days standard)\n• Live leaderboard, QR check-in, auto-pairings\n• Custom domain support\n\nSee a 2-min demo:\n👉 https://teevents.golf/interactive-demo\n\nStart for free or reserve a demo:\n👉 https://teevents.golf/get-started\n\nBest,\nRod Jackson\nTeeVents Golf',
  'Want me to mock up a site for {{tournament_name}}?',
  E'Hi {{first_name}},\n\nFollowing up — happy to mock up a free tournament site for {{tournament_name}} so you can see it before deciding anything.\n\nIt takes about 10 minutes and there''s no cost or commitment.\n\nStart here → https://teevents.golf/get-started\nOr reserve 15 min → https://teevents.golf/book\n\nBest,\nRod',
  'Last note on {{tournament_name}}',
  E'Hi {{first_name}},\n\nLast note from me — if a professional tournament site, online registration, sponsor management, and live leaderboard would help {{tournament_name}}, TeeVents is free to start.\n\n👉 https://teevents.golf/get-started\n\nIf not the right fit, no worries at all.\n\nBest,\nRod'
),
(
  'Generic (Editable Source)', false, 2,
  'A better tool than {{source}} for {{tournament_name}}?',
  E'Hi {{first_name}},\n\nI noticed you''re using {{source}} for {{tournament_name}}.\n\nBuilt by golf tournament managers, for golf tournament managers — TeeVents was built specifically for golf events. Funds go straight to your own Stripe account (T+2 days standard, no holds), and you get a branded tournament site, sponsor management, live leaderboard, auto-pairings, and QR check-in all in one place.\n\nSee a 2-min demo:\n👉 https://teevents.golf/interactive-demo\n\nStart for free or reserve a demo:\n👉 https://teevents.golf/get-started\n\nBest,\nRod Jackson\nTeeVents Golf',
  'What {{source}} doesn''t do for golf tournaments',
  E'Hi {{first_name}},\n\nQuick follow-up. Compared to {{source}}, TeeVents adds:\n\n✅ Live embeddable leaderboard\n✅ Hole sponsor management + asset/logo collection\n✅ Auto-pairings (handicap, team, sponsor)\n✅ Volunteer + player QR check-in\n✅ Automatic Stripe payouts (T+2 days)\n✅ Custom branded tournament site & domain\n\nAll features → https://teevents.golf/features\n\nBest,\nRod',
  '15 minutes to walk through TeeVents?',
  E'Hi {{first_name}},\n\nIf {{source}} is working great, ignore me! Otherwise I''d love to show you TeeVents in 15 minutes.\n\nReserve a time: https://teevents.golf/book\nOr start free: https://teevents.golf/get-started\n\nBest,\nRod'
);
