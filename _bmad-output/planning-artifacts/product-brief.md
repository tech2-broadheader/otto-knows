# Product Brief — Otto (Personal Daily Assistant)

| | |
|--|--|
| Author | BMAD Analyst (from locked spec) |
| Date | 2026-06-14 |
| Status | Draft for PM |
| Source | `personal-daily-assistant-spec.md` |

## 1. Problem
People's lives are fragmented across silos — a calendar here, reminders there, money in a banking app, health in a watch app. No tool *synthesizes* across them. A calendar that doesn't know payday is Friday and the bill is due Saturday is just a list. The result: people miss the connections that actually matter to their day, and the apps meant to help log data instead of looking out for them.

## 2. Vision
A personal **chief-of-staff** — "Otto" — that connects to your calendar, reminders, events, finances and wearable, reads them *through the lens of your daily routine*, and proactively tells you what matters today, then reshapes your day when you add something new. Explicitly **not Siri**: proactive and cross-domain, not reactive command-response.

## 3. Why this wins
This category wins on **trust + habit**, not features.
- **Daily-routine app → low churn.** People open it every day.
- **Synthesis across silos** is the value, not logging.
- **No ads.** "You pay us instead of being sold." Trust is the moat in a money-and-meds app.
- **Caregiver/family mode** is the headline differentiator.

## 4. Core mental model
> **Free = it remembers and reminds. Paid = it thinks and adjusts.**
Free is a smart organizer (no per-user LLM cost). Paid is the actual assistant (LLM reasoning, adaptive routine, optimizer) — which must be paid because it costs money per user.

## 5. Target user & market
- **Market:** Philippines first (Android-heavy). Cross-platform later via shared codebase.
- **User:** busy individuals juggling work, bills, meds and routines; plus caregivers managing a parent's meds/bills.
- **Segments to capture:** habitual daily users (low churn), subscription-haters (Lifetime SKU), caregivers (differentiator).

## 6. The three layers (what makes it work)
1. **Context graph** — calendar + reminders + events + finance + health, unified.
2. **Routine layer** — the lens / model of the user that times everything.
3. **LLM brain + write-back tools** — reasons over the graph, proposes actions (always confirmed).

## 7. What people actually pay for
The **optimizer**, the **tips**, and the **adaptive routine** — where it stops being a list and starts looking out for you.

## 8. Monetization
Freemium subscription + one-time **Lifetime** SKU. No ads. PH pricing anchors (to validate): Free ₱0 · Pro monthly ~₱99 · Pro annual ~₱599 ("₱50/mo") · Lifetime ~₱1,299.

## 9. Constraints & risks (must respect)
- **Play SMS permissions** — hard gate for finance auto-capture; manual entry is the fallback baseline.
- **Health data** — strictest platform + DPA category; explicit consent, no ad use, full disclosure.
- **DPA (PH)** — consent + encryption from day one across finance/health/routine.
- **LLM cost per paid user** — quota free, price Pro to cover.
- **Optimizer overreach** — human-in-the-loop always (propose-and-confirm).
- **Tone drift** — health/finance tips supportive and non-prescriptive, never punitive.

## 10. Success signals
Daily-open rate / streak retention (habit), free→Pro conversion, Lifetime attach, caregiver-mode adoption, low churn. Trust signals: consent completion, low permission-revocation, qualitative "it gets me" feedback.

## 11. Out of scope (v1)
Silent day-rewriting · personalized financial/medical advice · ad-based monetization · iOS-first launch · SMS auto-capture unless Play policy is verified.

## 12. Open decisions (for PM)
OD-1 platform confirm · OD-2 conversational depth of v1 · OD-3 finance capture method · OD-4 product name/brand · OD-5 pricing validation. (See `docs/scope.md §13`.)
