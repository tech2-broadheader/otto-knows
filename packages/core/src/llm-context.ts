// Serialize the context graph + routine into a compact, deterministic text block
// for the LLM prompt (Phase 2). Pure — keeps prompt assembly testable and keeps
// the prompt cache-friendly (no nondeterministic ordering; CLAUDE.md §6).
import type { ContextItem, Money, Routine } from "@otto/schemas";

function formatPeso(money: Money): string {
  return `${money.currency === "PHP" ? "₱" : ""}${(money.amountMinor / 100).toFixed(2)}`;
}

function timePart(iso: string): string {
  return /T(\d{2}:\d{2})/.exec(iso)?.[1] ?? iso;
}

export type SerializeContextInput = {
  /** YYYY-MM-DD */
  date: string;
  routine?: Routine;
  items: readonly ContextItem[];
  income?: readonly { source: string; amount: Money; nextPayDate: string }[];
};

/**
 * Render the user's day as a stable text block. Items are sorted by time so the
 * same day always serializes identically (cache-friendly).
 */
export function serializeContextForLlm(input: SerializeContextInput): string {
  const lines: string[] = [`Date: ${input.date}`];

  if (input.routine) {
    lines.push(`Routine mode: ${input.routine.mode}; timezone: ${input.routine.timezone}`);
    const anchors = [...input.routine.anchors].sort((a, b) => a.time.localeCompare(b.time));
    if (anchors.length > 0) {
      lines.push("Routine anchors:");
      for (const a of anchors) lines.push(`  - ${a.time} ${a.label} (${a.kind})`);
    }
  }

  if (input.income?.length) {
    lines.push("Income:");
    for (const i of input.income) {
      lines.push(`  - ${i.source}: ${formatPeso(i.amount)}, next pay ${i.nextPayDate}`);
    }
  }

  const items = [...input.items].sort((a, b) => a.at.localeCompare(b.at));
  lines.push(items.length ? "Today:" : "Today: (nothing scheduled)");
  for (const it of items) {
    lines.push(`  - ${timePart(it.at)} [${it.kind}] ${it.title}`);
  }

  return lines.join("\n");
}
