# Sprint Change Proposal — International markets (2026-10-08)

| | |
|--|--|
| Date | 2026-10-08 |
| Trigger | Product owner: market Otto outside the Philippines, not just PH banks |
| Change type | Strategic expansion (market scope) |
| Scope classification | **Major** for compliance (new gate per market), **Moderate** for code (new epic E13) |
| Status | **Approved** by product owner 2026-10-08 (decisions below) |

## 1. Decisions (product owner, 2026-10-08)

- **D1 Currency:** one **home currency per user**, chosen at setup; every wallet, bill, income and budget uses it. Multi-currency wallets (exchange rates) are out of scope for now.
- **D2 Launch markets:** Philippines, Southeast Asia, US / Canada, UK / Europe.
- **D3 Language:** English only at launch, **translation-ready** (all UI copy in one string catalog).
- **D4 Semi-monthly pay:** the user enters their **two pay days** (e.g. 1st & 15th, 15th & 30th); no country guess.

## 2. What is Philippines-specific today (evidence)

| Area | Where | Today |
|------|-------|-------|
| Currency | `packages/schemas/src/common.ts` `currencySchema = z.enum(["PHP"])` | PHP only |
| Money display | `apps/mobile/src/lib/money.ts`, `packages/core/src/format.ts` | hard-coded `₱`, `en-PH` |
| Amount parsing | `parsePesoToCentavos` | ₱ prefix, `.` decimal only |
| Timezone | `apps/web/src/server/llm/prompts.ts` | "Asia/Manila (UTC+08:00)" |
| Pay schedule | `packages/core/src/payday.ts` | semi-monthly inferred (15/30 default) |
| Privacy | `CLAUDE.md`, PRD NFR-1, ARCHITECTURE | PH Data Privacy Act only |
| Pricing | OD-5 | PHP only |
| Copy | screens | literal English strings, `₱` in labels |

Bank / wallet names are already free text — any country's banks work.

## 3. Impact

| Artifact | Change |
|----------|--------|
| PRD | New §5.11 FR-I1…I6; NFR-1 broadened to per-market privacy law; GATE-6 (legal review per market). |
| Architecture | ADR-007 locale & currency model; §11 privacy per region. |
| Epics | New **E13 Internationalization** (13.1–13.6). E11/E12 screens use the new money/date formatters (no `₱` literals). 11.4: semi-monthly uses stored pay days. |
| UX | Onboarding gains a "Country & currency" step; currency symbol comes from the user's currency (designs show ₱ as the example locale). |
| Compliance | **GATE-6:** privacy/legal review per market before launch there — GDPR (EU/UK: lawful basis, export, erasure, DPO/representative), CCPA/CPRA (California), PIPEDA (Canada), PDPA (Singapore/Malaysia/Thailand), UU PDP (Indonesia), PH DPA. Finance/health data handling already matches the strictest pattern (consent, encryption at rest, audit, erasure); export of user data (1.4 AC4) becomes required. |
| Billing | 9.4/9.6: store-localized prices per country (Play/App Store price tiers via RevenueCat) instead of a single PHP price. |

## 4. New epic E13 — Internationalization

```
### Story 13.1 — Home currency & locale foundation
- AC1 currencySchema = supported ISO 4217 set (PHP, SGD, MYR, IDR, THB, VND, USD, CAD, GBP, EUR, CHF,
      SEK, NOK, DKK, PLN, CZK); each with its minor-unit exponent (VND 0, others 2).
- AC2 UserSettings (home currency, locale, timezone) stored on device; defaults from the device locale,
      user-changeable; existing installs default to PHP / en-PH / Asia/Manila (no data change).
- AC3 One formatter module: formatMoney(minor, currency, locale), formatDate/Time(…, locale, tz) via Intl;
      parseMoneyInput(text, currency, locale) accepts the locale's decimal/grouping separators.
- AC4 No hard-coded ₱ / en-PH remains in shared code; core nudge/briefing copy formats with the user's settings.
- AC5 Tests across PHP, USD, EUR (de-DE comma decimals), GBP, VND (0 decimals), IDR.

### Story 13.2 — User timezone end-to-end
- AC1 Mobile sends the user's IANA timezone + current UTC offset with LLM requests.
- AC2 Prompts use the user's timezone (no hard-coded Manila); proposals keep that offset.

### Story 13.3 — Translation-ready copy
- AC1 All user-facing strings live in a typed string catalog (en) with interpolation; screens use t(key).
- AC2 Adding a language = adding a catalog file; missing keys fall back to English; a test fails on
      keys present in a translation but not in English.
- AC3 No new dependency (small in-repo helper) unless a later language needs plural rules beyond English.

### Story 13.4 — Country & currency onboarding
- AC1 Onboarding step: country (sets suggested currency/locale), confirm currency; editable in Settings.
- AC2 Changing currency later is allowed only while no money data exists, else explained (no conversion).

### Story 13.5 — Semi-monthly pay days
- AC1 Income for semi-monthly cadence stores two pay days (1–31, end-of-month allowed); payday logic
      uses them; existing PH incomes keep their inferred pair.

### Story 13.6 — Regional privacy compliance (GATE-6)
- AC1 Per-market legal review recorded before launch in that market.
- AC2 Data export (JSON) and account/data erasure available in Settings (completes 1.4 AC4).
- AC3 Privacy policy + consent copy versioned per region; lawful-basis wording for GDPR markets.
```

## 5. Sequencing

1. **13.1 + 13.5 first** (foundation; no UI dependency) → 2. build the approved E11/E12 screens on the new formatters → 3. 13.2, 13.3, 13.4 → 4. 13.6 before each market launch (GATE-6).

## 6. Handoff

PM: PRD edits + GATE-6 owner. Architect: ADR-007. Dev: 13.1 → 13.5 → screens. Legal: GATE-6 per market.
