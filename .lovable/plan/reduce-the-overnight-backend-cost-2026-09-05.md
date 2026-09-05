# Reduce the overnight backend cost

## What the numbers show

Your database server is sized **X-Large**, but it is barely being used:

- Memory in use: 9%
- Storage in use: 10% (491 MB of data)
- Active connections: 8 out of 240 available
- Restarts since last boot: 0
- No AI usage at all in the past two days

Nothing here is close to a limit. You are paying for a very large always-on server that is running near idle, and that hourly cost is what drains credits overnight even when you send no messages.

## Recommendation

Step the database server down to **Small**. That still leaves a wide margin over your current 9% memory use and 8 concurrent connections, and it is the single biggest reduction available in the overnight burn.

If you would rather be more cautious, **Medium** is the conservative middle option — less savings, more headroom. I do not recommend staying at X-Large.

Notes on the change:
- Storage stays exactly as it is. Storage and server size are separate; your data is untouched.
- The resize takes a few minutes, during which the site may briefly be unavailable. Best done outside a live tournament window.
- It is reversible: if you ever run a big event and need more power, the server can be sized back up.

## Steps

1. Open the database server size picker and set it to Small (or Medium if you prefer the safer option) — you confirm the size yourself in the picker.
2. Wait a few minutes for it to apply.
3. Re-check the health snapshot to confirm the database is back up and memory/connection use is still comfortable.
4. If memory use lands high after the change, step back up one size.

No application code, features, or settings change in this plan.
