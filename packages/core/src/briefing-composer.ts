// Template-based briefing composer (Story 4.2, free tier — no LLM).
// Turns the day's context items + nudges into one coherent, gentle summary.
// Pure: caller supplies id + generatedAt so it stays deterministic/testable.
import type { Briefing, BriefingSlot, ContextItem, Nudge } from "@otto/schemas";

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
};

const GREETING: Record<BriefingSlot, string> = {
  morning: "Good morning.",
  midday: "Quick midday check.",
  evening: "Winding down.",
};

function timePart(at: string): string {
  // "2026-06-14T08:00:00+08:00" -> "08:00"
  const match = /T(\d{2}:\d{2})/.exec(at);
  return match?.[1] ?? "";
}

function describeItems(items: readonly ContextItem[]): string {
  if (items.length === 0) return "Nothing scheduled — an open day.";
  const lead = items.length === 1 ? "1 thing on today" : `${items.length} things on today`;
  const preview = items
    .slice(0, 3)
    .map((it) => {
      const when = timePart(it.at);
      return when ? `${when} ${it.title}` : it.title;
    })
    .join(", ");
  const more = items.length > 3 ? `, and ${items.length - 3} more` : "";
  return `${lead}: ${preview}${more}.`;
}

/** Assemble a template `Briefing`. `source` is always "template" here. */
export function composeBriefing(input: ComposeBriefingInput): Briefing {
  const items = [...input.items];
  const nudges = [...(input.nudges ?? [])];

  const sentences = [GREETING[input.slot], describeItems(items)];
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
