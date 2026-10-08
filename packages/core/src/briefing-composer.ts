// Template-based briefing composer (Story 4.2, free tier — no LLM).
// Turns the day's context items + nudges into one coherent, gentle summary.
// Pure: caller supplies id + generatedAt so it stays deterministic/testable.
import type { Briefing, BriefingSlot, ContextItem, Nudge } from "@otto/schemas";
import { EN_CORE_COPY, type CoreCopy } from "./copy";

export type ComposeBriefingInput = {
  id: string;
  userId: string;
  slot: BriefingSlot;
  /** YYYY-MM-DD */
  date: string;
  items: readonly ContextItem[];
  nudges?: readonly Nudge[];
  /** ISO-8601 with offset */
  generatedAt: string;
  /** The app's wording (story 13.3); English when absent. */
  copy?: CoreCopy;
};

function timePart(at: string): string {
  // "2026-06-14T08:00:00+08:00" -> "08:00"
  const match = /T(\d{2}:\d{2})/.exec(at);
  return match?.[1] ?? "";
}

function describeItems(items: readonly ContextItem[], copy: CoreCopy): string {
  if (items.length === 0) return copy.briefing.openDay;
  const preview = items
    .slice(0, 3)
    .map((it) => {
      const when = timePart(it.at);
      return when ? `${when} ${it.title}` : it.title;
    })
    .join(", ");
  const more = items.length > 3 ? copy.briefing.more({ count: items.length - 3 }) : "";
  return `${copy.briefing.things({ count: items.length, preview })}${more}.`;
}

/** Assemble a template `Briefing`. `source` is always "template" here. */
export function composeBriefing(input: ComposeBriefingInput): Briefing {
  const items = [...input.items];
  const nudges = [...(input.nudges ?? [])];

  const copy = input.copy ?? EN_CORE_COPY;
  const sentences = [copy.briefing.greeting[input.slot], describeItems(items, copy)];
  for (const nudge of nudges) sentences.push(nudge.message);

  return {
    id: input.id,
    userId: input.userId,
    slot: input.slot,
    date: input.date,
    summary: sentences.join(" "),
    items,
    nudges,
    source: "template",
    generatedAt: input.generatedAt,
  };
}
