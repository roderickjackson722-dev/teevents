# Public Page Permissions — Incident Summary, Rollback & Canary

_Last updated: 2026-08-31_

## 1. What broke

Public tournament pages (e.g. `https://www.teevents.golf/t/gamble-sands-tournament`)
showed the "Just a moment — loading this tournament page" retry card instead of the
tournament.

**Root cause:** a database cleanup revoked *table-level* `SELECT` from the `anon`
role on `tournaments` (and a few sample/demo tables). Row Level Security policies
were still in place, but Postgres checks grants **before** RLS — so the
`resolve_public_tournament` RPC returned nothing and the page fell back to its
retry card.

Two independent layers must both be correct:

| Layer | Purpose | Failure symptom |
| --- | --- | --- |
| `GRANT SELECT ... TO anon` | can the role touch the table at all | `permission denied for table ...` / empty RPC results |
| RLS policy | which rows the role may see | page renders but data is missing |

## 2. What was changed to fix it

Restored the missing grants:

```sql
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT ON public.demo_tournaments TO anon;
GRANT SELECT ON public.demo_players TO anon;
GRANT SELECT ON public.sample_tournaments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_auction_items TO authenticated;
```

Both affected pages were then verified to render with the correct `og:title`.

## 3. Permission audit (2026-08-31)

229 tables in the `public` schema.

- `authenticated` and `service_role`: full `SELECT/INSERT/UPDATE/DELETE` on all 229 tables. No gaps.
- `anon`: `SELECT` on 217 tables. The 12 tables **without** anon read access are
  intentionally hardened (PII / money) and are reached only through
  `SECURITY DEFINER` RPCs such as `get_public_auctions`, `get_public_raffles`,
  `get_public_sponsor_registrations`, `get_public_vendor_registrations`,
  `get_public_donation_total`:

  `auctions`, `director_shop_orders`, `league_members`,
  `organization_payout_methods`, `raffles`, `sponsor_registrations`,
  `team_promoters`, `tournament_auction_bids`, `tournament_auction_items`,
  `tournament_donations`, `tournament_offline_donations`, `vendor_registrations`

  **Do not** add anon `SELECT` to these — it would re-open the PII findings that
  were previously remediated. Public pages must keep using the RPCs.

Every table required by public pages currently has the read access it needs.

## 4. Rollback plan

`docs/db-grants-baseline.sql` is a generated, idempotent snapshot of every
table grant for `anon`, `authenticated` and `service_role` at the known-good
state above (686 statements).

**To restore:** run the entire file as a single migration. Re-granting an
existing privilege is a no-op, so it is safe to run at any time and does not
touch RLS policies.

To refresh the baseline after an intentional permission change:

```bash
psql -At -c "
with g as (
  select c.relname, a.grantee::regrole::text as role, a.privilege_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public',
       aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  where c.relkind in ('r','p','v','m')
)
select 'GRANT ' || string_agg(distinct privilege_type, ', ' order by privilege_type)
    || ' ON public.' || quote_ident(relname) || ' TO ' || role || ';'
from g
where role in ('anon','authenticated','service_role')
  and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
group by relname, role order by relname, role" >> docs/db-grants-baseline.sql
```

## 5. Daily canary

Endpoint: `/api/public/hooks/tournament-page-canary` (GET or POST, no body).

Stable URLs:
- production — `https://www.teevents.golf/api/public/hooks/tournament-page-canary`

What it checks, every run:

1. **Page render** — fetches `/t/gamble-sands-tournament`, fails on non-200, on
   "Tournament not found", and on the "Just a moment" retry card.
2. **Resolver RPC with the anon key** — calls `resolve_public_tournament`
   exactly as a browser would. This is the check that would have caught the
   original incident immediately.
3. **Anon read probes** — a `head` count against `tournaments`,
   `tournament_registrations`, `sponsorship_tiers`, `public_events`,
   `golf_courses`, `event_resources`, `tournament_photos`. Zero rows is fine;
   a `permission denied` is a failure.

On any failure it emails **info@teevents.golf** with a per-check error table and
a pointer to this document, and writes a row to `public.link_check_logs` with a
`run_id` prefixed `canary-` (visible in Admin → Link Health).

Change the target page by setting the `CANARY_TOURNAMENT_SLUG` environment
variable; it defaults to `gamble-sands-tournament`.

### Schedule

Runs daily at 07:00 UTC (03:00 ET) via `pg_cron` job `daily-tournament-page-canary`:

```sql
select cron.schedule(
  'daily-tournament-page-canary',
  '0 7 * * *',
  $$select net.http_post(
      url := 'https://www.teevents.golf/api/public/hooks/tournament-page-canary',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);
```

Manual run:

```bash
curl -s https://www.teevents.golf/api/public/hooks/tournament-page-canary | jq
```

It returns `{ ok: true, checks: [...] }` on success, or HTTP 500 with a
`failures` array naming each broken check.
