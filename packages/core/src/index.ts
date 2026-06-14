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
// Cross-domain insights (payday-vs-bill nudges, …).
export * from "./insights";
// Story 4.2 — template-based briefing composer (free tier).
export * from "./briefing-composer";
