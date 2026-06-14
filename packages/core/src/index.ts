// @otto/core — shared, pure domain logic (the routine engine, context-graph helpers).
// Lives platform-agnostic so both the mobile app and the web backend import it.
// Story 2.2 (scheduling substrate) and 3.3 (context-graph unification) land here.

/** Greeting helper used by the placeholder app screens until real features land. */
export function greeting(name: string): string {
  return `Otto knows your day, ${name}.`;
}
