# Story 9.5: Server entitlement from verified purchases

Status: in-progress — Tasks 1–4 done; Task 5 manual test needs RevenueCat + Supabase accounts

## Story

As Broadheader,
I want Pro access granted and removed only from verified store events,
so that nobody can unlock Pro from the client and paying users get access within seconds.

## Acceptance Criteria

1. `POST /api/billing/revenuecat` verifies the `Authorization` header against `REVENUECAT_WEBHOOK_AUTH` with a constant-time compare; anything else → 401 and no change.
2. The body is validated with Zod (only the fields we use). Malformed → 400.
3. **Idempotent and ordered:** each event `id` is recorded once in `billing_events`; a duplicate returns 200 without re-applying. An event older (`event_timestamp_ms`) than the last applied event for that user is recorded but not applied.
4. Entitlement rules (pure function, unit-tested), only when the event's `entitlement_ids` include our entitlement (`REVENUECAT_ENTITLEMENT_ID`, default `pro`):
   - Grant — `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED`, `PRODUCT_CHANGE`: `lifetime` when `expiration_at_ms` is null, else `pro`.
   - `EXPIRATION` → `free`.
   - `CANCELLATION` → `free` only if access already ended (`expiration_at_ms` null — a refunded lifetime — or ≤ `event_timestamp_ms`, i.e. refunded period); a normal cancellation keeps access until `EXPIRATION`.
   - A `lifetime` user is never downgraded by subscription events (only by cancellation of the lifetime purchase itself).
   - Everything else (`TEST`, `BILLING_ISSUE`, `SUBSCRIPTION_PAUSED`, `TRANSFER`, …) → no change.
5. `app_user_id` must be a Supabase user UUID (mobile calls RevenueCat `logIn(userId)` in 9.4); anonymous / non-UUID ids are recorded and ignored. `SANDBOX` events apply only when `REVENUECAT_ALLOW_SANDBOX=true`.
6. Writes `profiles.entitlement` (upsert), audit-logs the change (`audit_events`, entity `entitlement`), never trusts amounts or anything from the client. Returns 200 for every recorded event so RevenueCat stops retrying.

## Tasks / Subtasks

- [ ] **Task 1 — Rules** (AC 4, 5): `apps/web/src/server/billing/entitlement-rules.ts` — `decideEntitlement(event, current, config)` → `{ next } | { skip: reason }`. Tests for every branch.
- [ ] **Task 2 — Contract & config** (AC 1, 2, 5): Zod `revenueCatWebhookSchema`; config vars `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_ENTITLEMENT_ID`, `REVENUECAT_ALLOW_SANDBOX`; `.env.example`.
- [ ] **Task 3 — Persistence** (AC 3, 6): `billing_events` table (migration 0002); `BillingStore` port + Drizzle implementation (record event, last applied timestamp, upsert entitlement, audit).
- [ ] **Task 4 — Handler + route** (AC 1–6): `handleRevenueCatWebhook(request, deps)` tested with fakes; thin route.
- [ ] **Task 5 — Gates** + docs (SETUP-supabase billing section). Manual: RevenueCat dashboard "Send test event" → 200.

## Dev Notes

- Event semantics verified against RevenueCat docs 2026-10-08: [Webhooks](https://www.revenuecat.com/docs/integrations/webhooks) (auth header, 200 = success, up to 5 retries, duplicates possible → track `id`) and [Event types and fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields) (EXPIRATION: "access should be removed"; CANCELLATION: "canceled or refunded"; `expiration_at_ms` "can be null for non-subscription purchases or lifetime products").
- HMAC signing (`X-RevenueCat-Webhook-Signature`) is optional in RevenueCat; header auth is used now, HMAC is a follow-up.
- `TRANSFER` is not applied automatically in v1 (we can't tell the destination tier from the event); it is recorded for manual reconcile.
- No new dependency (fetch-free; Drizzle already present).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- 2026-10-08, tests first (rules and handler suites seen failing): `decideEntitlement` (20 tests); `handleRevenueCatWebhook` (8 tests: auth, unconfigured, malformed, grant + audit, duplicate, out-of-order, expiration, ignored events still 200).
- Constant-time header compare via SHA-256 digests + `timingSafeEqual`.
- `billing_events` table (migration `0002_billing_events`); `DbBillingStore` (insert … on conflict do nothing → duplicate detection; profile upsert; audit to `audit_events`).
- Config: `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_ENTITLEMENT_ID` (default pro), `REVENUECAT_ALLOW_SANDBOX` (default false); commented in `.env.example`.
- Not transactional across record/apply: a crash between `setEntitlement` and `markApplied` makes RevenueCat's retry hit "duplicate" and skip — the entitlement is already set, so the outcome is the same. Acceptable for v1.
- Gates: web tests ✅ 98, typecheck ✅.

### File List

- apps/web/src/server/billing/entitlement-rules.ts (+ test), webhook.ts (+ test), billing-store-db.ts (new)
- apps/web/src/app/api/billing/revenuecat/route.ts (new)
- apps/web/src/server/db/schema.ts; apps/web/drizzle/0002_billing_events.sql, meta/0002_snapshot.json, meta/_journal.json
- apps/web/src/lib/config.ts; .env.example; docs/SETUP-supabase.md
