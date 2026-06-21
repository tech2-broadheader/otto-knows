"use client";

import { useState } from "react";
import type { Proposal, ProposalAction } from "@otto/schemas";
import "../(marketing)/marketing.css";
import "./playground.css";

/**
 * Dev playground — type natural language, watch Otto (the LLM proxy) turn it
 * into confirmable proposals, rendered in the OTTO design. A developer aid for
 * eyeballing the brain without the mobile app; nothing is persisted (the API
 * returns proposals only — CLAUDE.md §1.11). Accept/Dismiss are local-only here.
 */

const EXAMPLES = [
  "Pay Meralco 2480 on Saturday",
  "Remind me to take Losartan at 8am every day",
  "Lunch with Tita Beth on Friday 12pm",
  "Block 30 minutes for a workout at 6pm",
  "Spent 350 on groceries today",
];

const ACTION_LABEL: Record<ProposalAction["type"], string> = {
  create_reminder: "New reminder",
  log_expense: "Log expense",
  add_bill: "Add bill",
  add_medication: "Add medication",
  block_time: "Block time",
  add_routine_anchor: "Routine anchor",
};

const ACTION_COLOR: Record<ProposalAction["type"], string> = {
  create_reminder: "#007A33",
  log_expense: "#E0992B",
  add_bill: "#3E91C9",
  add_medication: "#DC5A48",
  block_time: "#004D00",
  add_routine_anchor: "#10A074",
};

function money(m: { amountMinor: number; currency: string }): string {
  const value = (m.amountMinor / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (m.currency === "PHP" ? "₱" : m.currency + " ") + value;
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function repeats(r: { freq: string }): string {
  return r.freq === "once" ? "one-time" : r.freq;
}

/** Build the [label, value] detail rows for one action, by type. */
function rows(a: ProposalAction): Array<[string, string]> {
  switch (a.type) {
    case "add_bill":
      return [
        ["Name", a.bill.name],
        ["Amount", money(a.bill.amount)],
        ["Due", a.bill.dueDate],
        ["Repeats", repeats(a.bill.recurrence)],
      ];
    case "add_medication": {
      const r: Array<[string, string]> = [["Name", a.medication.name]];
      if (a.medication.dosage) r.push(["Dosage", a.medication.dosage]);
      r.push(["Times", a.medication.times.join(", ")]);
      r.push(["Repeats", repeats(a.medication.recurrence)]);
      return r;
    }
    case "create_reminder": {
      const r: Array<[string, string]> = [["Title", a.reminder.title]];
      if (a.reminder.dueAt) r.push(["When", when(a.reminder.dueAt)]);
      if (a.reminder.notes) r.push(["Notes", a.reminder.notes]);
      if (a.reminder.recurrence) r.push(["Repeats", repeats(a.reminder.recurrence)]);
      return r;
    }
    case "log_expense": {
      const r: Array<[string, string]> = [["Amount", money(a.expense.amount)]];
      if (a.expense.description) r.push(["Note", a.expense.description]);
      r.push(["When", when(a.expense.occurredAt)]);
      return r;
    }
    case "block_time":
      return [
        ["Title", a.block.title],
        ["Start", when(a.block.startAt)],
        ["End", when(a.block.endAt)],
      ];
    case "add_routine_anchor":
      return [
        ["Label", a.anchor.label],
        ["Kind", a.anchor.kind],
        ["Time", a.anchor.time],
        ["Repeats", repeats(a.anchor.recurrence)],
      ];
  }
}

type Resolution = "accepted" | "dismissed";

export default function PlaygroundPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});

  async function ask(input: string) {
    const value = input.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setProposals(null);
    setResolved({});
    try {
      const res = await fetch("/api/llm/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const json = (await res.json()) as
        | { data: { proposals: Proposal[] } }
        | { error: { code: string; message: string } };
      if ("error" in json) {
        setError(json.error.message || "Otto couldn't process that.");
      } else {
        setProposals(json.data.proposals);
      }
    } catch {
      setError("Couldn't reach the backend. Is the dev server running on :3000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pg">
      <header className="pg__head">
        <div className="eyebrow">Otto · the brain · dev playground</div>
        <h1>Talk to Otto.</h1>
        <p>
          Type it the way you&apos;d tell an assistant. Otto turns it into confirmable proposals — it never
          saves anything here, it just shows what it <em>would</em> suggest.
        </p>
      </header>

      <form
        className="pg__form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <textarea
          className="pg__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pay Meralco 2480 on Saturday and remind me to take Losartan at 8am…"
          // Submit on Cmd/Ctrl+Enter
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void ask(text);
            }
          }}
        />
        <div className="pg__actions">
          <button type="submit" className="btn btn--primary" disabled={loading || !text.trim()}>
            {loading ? "Otto's thinking…" : "Ask Otto"}
          </button>
          <span className="pg__hint">⌘/Ctrl + Enter</span>
        </div>
      </form>

      <div className="pg__examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            onClick={() => {
              setText(ex);
              void ask(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="pg__error">{error}</div>}

      {proposals && (
        <section className="pg__results">
          {proposals.length === 0 ? (
            <p className="pg__empty">
              Otto didn&apos;t find anything to propose. Try including an amount, a date, or a time.
            </p>
          ) : (
            <>
              <p className="pg__results-head">
                Otto suggests {proposals.length} {proposals.length === 1 ? "thing" : "things"}
              </p>
              <div className="pg__cards">
                {proposals.map((p) => {
                  const res = resolved[p.id];
                  return (
                    <article key={p.id} className={`card pg-card${res ? " is-resolved" : ""}`}>
                      <div className="pg-card__top">
                        <span className="pg-dot" style={{ background: ACTION_COLOR[p.action.type] }} />
                        <span className="pg-card__label">{ACTION_LABEL[p.action.type]}</span>
                        <span className={`pg-status${res ? " " + res : ""}`}>{res ?? "proposed"}</span>
                      </div>
                      <p className="pg-card__rationale">{p.rationale}</p>
                      <dl className="pg-card__rows">
                        {rows(p.action).map(([k, v]) => (
                          <div className="pg-row" key={k}>
                            <dt>{k}</dt>
                            <dd className={k === "Amount" ? "amt" : undefined}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {!res && (
                        <div className="pg-card__buttons">
                          <button
                            type="button"
                            className="btn btn--primary pg-mini"
                            onClick={() => setResolved((m) => ({ ...m, [p.id]: "accepted" }))}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost pg-mini"
                            onClick={() => setResolved((m) => ({ ...m, [p.id]: "dismissed" }))}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      <p className="pg__foot">
        Dev tool. Proposals come from the LLM proxy (<code>/api/llm/quick-add</code>) and are never applied
        server-side — Accept/Dismiss here are visual only. Provider &amp; key live in{" "}
        <code>apps/web/.env.local</code>.
      </p>
    </main>
  );
}
