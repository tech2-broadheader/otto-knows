# UX Spec — Otto (handoff for the Claude Design pass)

> **Purpose.** This is the "raw UI/UX" (BMAD UX Designer output) that the **Claude Design** pass polishes on the canvas — layout, spacing, type, color, branding (CLAUDE.md §5, Milestone 1). The screens below are **built and functional but visually unstyled** (neutral slate, NativeWind utility classes, text-glyph tab icons). Design decisions are intentionally left open (§5 below).
> **Platform:** React Native + Expo (Android-first). **Last updated:** 2026-06-15.

---

## 1. Product in one line
A proactive, cross-domain personal chief-of-staff. Free = it remembers and reminds; Pro = it thinks and adjusts. Tone: calm, warm, never nagging (spec §2, §6.2).

## 2. Navigation map
```
Boot → (first run?) → Onboarding ─────────────┐
                                               ↓
Main (bottom tabs):
  ☀  Today        — daily briefing + nudges + (Pro) LLM brief & proposals
  ＋  Quick Add    — natural-language → confirmable proposals (Pro/quota)
  🔔 Reminders    — list / add / done; "remind me" schedules a notification
  💊 Health       — medications (list / add / edit); feeds Today + reminders
  ₱  Finance      — income, bills, transactions, monthly budget
  ⚙  Settings (stack):
        • Settings home — consent toggles, Google Calendar connect, About/version
        • Optimizer (Pro) — reshape the day for a new routine (propose-and-confirm)
        • Tips (Pro) — gentle finance / health tips
        • Upgrade (NEW) — plans & paywall  ← reached from every Pro gate

Onboarding flow: Welcome → Consent (per-source) → Routine setup (seeded anchors) → Main
```

## 3. Screen inventory
| Screen | Purpose | Key components | States |
|--------|---------|----------------|--------|
| Onboarding | First-run welcome → consent → routine | Card, ToggleRow, Button | — |
| Today | The home — briefing, nudges, today's items; Pro brief + ProposalCards | Card, Banner, ProposalCard, AsyncBoundary | loading / error / empty (clear day) |
| Quick Add | NL note → proposals → confirm | LabeledInput, Button, ProposalCard | loading / error / empty / quota-reached |
| Reminders | List / add / mark done | Card, LabeledInput, Button, ToggleRow | loading / error / empty |
| Health (Meds) | List / add / edit medications | Card, LabeledInput, Button | loading / error / empty / at free cap |
| Finance | Wallets, safe-to-spend, transactions (expense / income / transfer), bills, budget, monthly report (see §7) | Card, LabeledInput, Button, Banner | loading / error / empty / at free cap / no income set up / negative safe-to-spend |
| Settings | Consent, Google Calendar, About, Pro links | Card, ToggleRow, GoogleCalendarCard, Button | — |
| Optimizer (Pro) | Describe new routine → proposed reshaped day → Apply | LabeledInput, Button, Card | idle / proposing / proposal / applied / not-pro / error |
| Tips (Pro) | Finance/health tips, domain toggle | Card, Button | loading / error / empty / not-pro |
| Upgrade (Pro paywall) | Plans + CTA | Card, Button | — |

## 4. Reusable components (already built — `src/components`)
- `ui.tsx`: `Card`, `LabeledInput`, `Button` (primary/secondary/danger), `ToggleRow`, `Banner` (info/warning).
- `AsyncBoundary.tsx`: `LoadingState`, error + empty wrappers, `ScreenScroll`.
- `ProposalCard.tsx`: the propose-and-confirm surface (Accept / Dismiss) — used by Quick Add, Today, Optimizer.
- `GoogleCalendarCard.tsx`: connect / sync / disconnect.

## 5. Open design decisions (for the Claude Design pass)
- **Brand & palette.** No palette chosen — currently neutral slate. Pick Otto's colors, accent, and surfaces. Mascot is wired as a placeholder icon/splash (`apps/mobile/assets/`) — refine or replace.
- **Typography.** No type scale chosen. Define display/body/caption.
- **Tab bar.** 6 tabs is the current shape (Today / Add / Reminders / Health / Finance / Settings) — consider consolidating (e.g. fold Health into a "+"-style add, or group). Replace text-glyph icons with a real icon set.
- **Today as the hero.** It's the daily-habit surface; design should make the briefing feel like one warm voice, not a list dump (spec §6).
- **Tone in UI copy.** Gentle, non-prescriptive; nudges are "heads-ups," never alarms (spec §6.2).
- **Pro vs Free affordances.** How upgrade prompts and locked features read without feeling naggy.
- **Empty states.** Each list has a functional empty state; design should make them inviting (esp. a clear day on Today).

## 6. Out of scope for this pass
Caregiver/family mode (Phase 4), Health Connect UI (Phase 4), widgets/themes (Phase 5). Real auth/login UI is pending the foundations work (separate track).

## 7. Budgeting+ screens (E11 — for the Claude Design pass, added 2026-10-07)
Approved Claude Design output is required before the UI work in stories 11.2–11.5 starts (CLAUDE.md §5).
1. **Finance home** — safe-to-spend hero (with per-day figure and payday date), wallets strip with balances, budget ring, recent transactions, link to monthly report.
2. **Add / edit transaction** — type segmented control (Expense / Income / Transfer), wallet picker (from + to for transfers), amount, category (expense only), note, date.
3. **Wallets** — list, add/edit (type, provider label, opening balance), archive; credit card shows "owed" instead of a balance; free-cap upgrade prompt at 3.
4. **Monthly report** — month switcher, income / spending / net summary, category bars with change vs last month, first-month "no comparison yet" state.
- **Tone:** negative safe-to-spend is a heads-up ("Bills before payday exceed what's on hand by ₱X"), never a scold.

## 8. Design approval & international notes (2026-10-08)
- The E11/E12 screens were designed on the canvas "Otto — Budgeting+ & Daily Tasks screens" and **approved by the product owner on 2026-10-08**: Money home, safe-to-spend states, Add transaction, Wallets, Add wallet, Monthly report, Notes (inside the Reminders tab: Reminders / Notes / Appointments), Note editor, New appointment, Today additions.
- **₱ in the designs is the example locale.** Implemented screens take the symbol, separators and date format from the user's home currency and locale (ADR-007); no screen hard-codes ₱.
- Onboarding gains a **Country & currency** step (13.4); Settings shows and edits it.

## 9. Still-to-build designs (approved 2026-10-08)
Added to the same canvas ("Still to build" row) and **approved by the product owner on 2026-10-08**:
- **Your data** (Settings): download a copy (JSON), erase data on this phone (account stays), delete account; erasures confirm in a bottom sheet first.
- **Quick Add — Paid from:** a `log_expense` proposal shows wallet pills (last used pre-selected) and the wallet's balance after the expense before "Log it" (11.3 AC5).
- **Alarms** (12.3): a fourth "Alarms" segment in Reminders ("Appointments" shortened to "Appts"), New alarm form, full-screen ringing with Snooze / Dismiss. Built once ADR-005 and GATE-4 clear.
- **Meeting invites** (12.5): attendees by email, optional Meet link, and a confirm sheet listing exactly who will be emailed. Built once GATE-5 clears.
