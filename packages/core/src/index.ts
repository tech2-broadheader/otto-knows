// @otto/core — shared, pure domain logic (the routine engine, context-graph helpers).
// Lives platform-agnostic so both the mobile app and the web backend import it.
// Story 2.2 (scheduling substrate) and 3.3 (context-graph unification) land here.

/** Greeting helper used by the placeholder app screens until real features land. */
export function greeting(name: string): string {
  return `Otto knows your day, ${name}.`;
}

// Story 2.2 — scheduling substrate (free-space slotting + relative placement).
export * from "./scheduling";
// Story 3.3 — context-graph unification ("what's on today").
export * from "./context-graph";
// Recurrence evaluation (does a recurring item land on a date?).
export * from "./recurrence";
// Story 3.2 — budget math (spent vs limit per category).
export * from "./budget";
// Story 11.2 — wallet balances (derived, ADR-004).
export * from "./accounts";
// Story 11.4 — payday rollover + safe-to-spend until payday.
export * from "./payday";
export * from "./safe-to-spend";
export * from "./format";
// Story 11.5 — monthly report.
export * from "./monthly-report";
// Story 12.1 — notes ordering, search, note → reminder draft.
export * from "./notes";
// Story 12.4 — appointment time helpers.
export * from "./appointments";
// Cross-domain insights (payday-vs-bill nudges, …).
export * from "./insights";
// Story 4.2 — template-based briefing composer (free tier).
export * from "./briefing-composer";
// Story 3.1 — pure Google Calendar event normalizer (shared web + mobile).
export * from "./google-calendar";
// Story 4.1 — routine-timed notification planning.
export * from "./notification-plan";
// Phase 2 — serialize the context graph + routine for the LLM prompt.
export * from "./llm-context";
// E7 — cross-domain forecasts (med-refill, overspend).
export * from "./forecasts";
// E7 — adaptive routine (7.1) + deviation radar (7.2).
export * from "./adaptive";
export * from "./alarms";
export * from "./copy";
export * from "./bills";
