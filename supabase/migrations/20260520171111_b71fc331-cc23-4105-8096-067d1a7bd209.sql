UPDATE public.outreach_campaigns
SET
  email1_subject = '{{tournament_name}} — Does Eventbrite hold your funds?',
  email1_body = 'Hi {{first_name}},

I noticed your golf tournament "{{tournament_name}}" on Eventbrite.

Quick question: does Eventbrite hold your registration fees until after the event ends? Most organizers don''t realize they wait weeks to access their own money.

See how it works in 2 minutes (no call needed):
👉 https://teevents.golf/interactive-demo

You''ll also get:
• Live leaderboard (embed on your website)
• Hole sponsor management & asset delivery
• QR volunteer check-in
• Lower fees than Eventbrite

...and much more → https://teevents.golf/features

If it''s not a fit, no worries.

Best,
Rod Jackson
TeeVents Golf',
  email2_subject = '{{tournament_name}} — Eventbrite vs. TeeVents',
  email2_body = 'Hi {{first_name}},

Here''s what TeeVents offers for "{{tournament_name}}" that Eventbrite doesn''t:

✅ Live leaderboard (embed on your website)
✅ Hole sponsor management & asset delivery
✅ Volunteer check-in with QR codes
✅ Automatic payouts to your own Stripe account (T+2 business days)
✅ Custom tournament website with your branding

...and much more → https://teevents.golf/features

See the full comparison:
👉 https://teevents.golf/compare/eventbrite-vs-teevents

Best,
Rod',
  email3_subject = '{{tournament_name}} — See TeeVents in 2 minutes',
  email3_body = 'Hi {{first_name}},

See exactly how TeeVents works for "{{tournament_name}}" — no call required.

Try the interactive demo:
👉 https://teevents.golf/interactive-demo

Ready to start? Create your free tournament:
👉 https://teevents.golf/get-started

No call needed. No credit card required.

Best,
Rod',
  updated_at = now()
WHERE name = 'Default Eventbrite Sequence';