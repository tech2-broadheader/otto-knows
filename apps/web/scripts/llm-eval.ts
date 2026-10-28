/**
 * Side-by-side LLM provider check (ADR-009). Runs real Quick Add notes through
 * the production quick-add code against each configured provider and scores
 * the proposals against known answers (action, amount, local date/time and
 * offset). Also saves sample briefings for a human read.
 *
 *   pnpm --filter @otto/web exec tsx scripts/llm-eval.ts [--only groq|gemini|anthropic] [--out <file.md>]
 *
 * Keys come from apps/web/.env.local and are never printed. Makes real (paid /
 * rate-limited) API calls: run it on purpose, not in CI.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { AiUserContext, Proposal } from "@otto/schemas";
import { AnthropicLlmClient, type LlmClient } from "../src/server/llm/client";
import { GeminiLlmClient } from "../src/server/llm/gemini";
import { GroqLlmClient } from "../src/server/llm/groq";
import { generateQuickAdd } from "../src/server/llm/quick-add";
import { generateBriefing } from "../src/server/llm/brief";

const ENV_FILE = join(__dirname, "..", ".env.local");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

/** One fixed instant for every case: Wed 28 Oct 2026, 02:00 UTC. */
const NOW = "2026-10-28T02:00:00.000Z";
/** Pause between calls; Gemini's free tier allows 5 requests a minute. */
const PAUSE_MS = 3000;
const GEMINI_PAUSE_MS = 13_000;
/** On a rate limit, wait and retry (free tiers cap requests and tokens per minute). */
const RETRY_WAITS_MS = [30_000, 60_000, 90_000];

const MANILA: AiUserContext = { timezone: "Asia/Manila", currency: "PHP", locale: "en-PH" };
const NEW_YORK: AiUserContext = { timezone: "America/New_York", currency: "USD", locale: "en-US" };
const LONDON: AiUserContext = { timezone: "Europe/London", currency: "GBP", locale: "en-GB" };
const BERLIN: AiUserContext = { timezone: "Europe/Berlin", currency: "EUR", locale: "de-DE" };
const SAIGON: AiUserContext = { timezone: "Asia/Ho_Chi_Minh", currency: "VND", locale: "vi-VN" };
const SINGAPORE: AiUserContext = { timezone: "Asia/Singapore", currency: "SGD", locale: "en-SG" };

/** What one proposal must look like. `at` = "YYYY-MM-DDTHH:mm" local + offset. */
type Expect =
  | { type: "log_expense"; amountMinor: number; date?: string }
  | { type: "add_bill"; amountMinor: number; dueDate: string }
  | { type: "create_reminder"; at?: { local: string; offset: string }; date?: string }
  | { type: "create_event"; at: { local: string; offset: string } }
  | { type: "add_note"; contains: string }
  | { type: "add_medication"; times: string[] }
  | { type: "add_routine_anchor" | "create_reminder"; anyOf: true };

type Case = { id: number; text: string; user: AiUserContext; expect: Expect[] };

const at = (local: string, offset: string) => ({ local, offset });

// Local "now" per zone at NOW: Manila/Singapore Wed 10:00 (+08:00), New York
// Tue 27 Oct 22:00 (−04:00), London Wed 02:00 (+00:00), Berlin Wed 03:00
// (+01:00), Ho Chi Minh Wed 09:00 (+07:00).
const CASES: Case[] = [
  { id: 1, text: "Lunch 180", user: MANILA, expect: [{ type: "log_expense", amountMinor: 18000 }] },
  {
    id: 2,
    text: "Grab 250 to work",
    user: MANILA,
    expect: [{ type: "log_expense", amountMinor: 25000 }],
  },
  {
    id: 3,
    text: "Paid Meralco 2,480.50",
    user: MANILA,
    expect: [{ type: "log_expense", amountMinor: 248050 }],
  },
  {
    id: 4,
    text: "Meralco bill 2480 due on the 5th",
    user: MANILA,
    expect: [{ type: "add_bill", amountMinor: 248000, dueDate: "2026-11-05" }],
  },
  {
    id: 5,
    text: "Remind me to call mom tonight at 8",
    user: MANILA,
    expect: [{ type: "create_reminder", at: at("2026-10-28T20:00", "+08:00") }],
  },
  {
    id: 6,
    text: "Dentist tomorrow 3pm",
    user: MANILA,
    expect: [{ type: "create_event", at: at("2026-10-29T15:00", "+08:00") }],
  },
  {
    id: 7,
    text: "Gym Mon Wed Fri 6am",
    user: MANILA,
    expect: [{ type: "add_routine_anchor", anyOf: true }],
  },
  {
    id: 8,
    text: "note: gift ideas for Ana — scarf, book",
    user: MANILA,
    expect: [{ type: "add_note", contains: "scarf" }],
  },
  {
    id: 9,
    text: "Vitamin D every morning at 8",
    user: MANILA,
    expect: [{ type: "add_medication", times: ["08:00"] }],
  },
  {
    id: 10,
    text: "Coffee 120 and parking 50",
    user: MANILA,
    expect: [
      { type: "log_expense", amountMinor: 12000 },
      { type: "log_expense", amountMinor: 5000 },
    ],
  },
  {
    id: 11,
    text: "Rent 15000 due Nov 1, remind me the day before",
    user: MANILA,
    expect: [
      { type: "add_bill", amountMinor: 1500000, dueDate: "2026-11-01" },
      { type: "create_reminder", date: "2026-10-31" },
    ],
  },
  {
    id: 12,
    text: "Meeting with Carlo Friday 10am for 30 minutes",
    user: MANILA,
    expect: [{ type: "create_event", at: at("2026-10-30T10:00", "+08:00") }],
  },
  { id: 13, text: "hello how are you", user: MANILA, expect: [] },
  {
    id: 14,
    text: "Lunch 12.50",
    user: NEW_YORK,
    expect: [{ type: "log_expense", amountMinor: 1250 }],
  },
  { id: 15, text: "Uber 23", user: NEW_YORK, expect: [{ type: "log_expense", amountMinor: 2300 }] },
  {
    id: 16,
    text: "Remind me to submit the report tomorrow at 9am",
    user: NEW_YORK,
    expect: [{ type: "create_reminder", at: at("2026-10-28T09:00", "-04:00") }],
  },
  {
    id: 17,
    text: "Doctor appointment Thursday 2:30pm",
    user: NEW_YORK,
    expect: [{ type: "create_event", at: at("2026-10-29T14:30", "-04:00") }],
  },
  {
    id: 18,
    text: "Netflix 15.49 due on the 12th every month",
    user: NEW_YORK,
    expect: [{ type: "add_bill", amountMinor: 1549, dueDate: "2026-11-12" }],
  },
  {
    id: 19,
    text: "Groceries 86.20 at Trader Joe's",
    user: NEW_YORK,
    expect: [{ type: "log_expense", amountMinor: 8620 }],
  },
  {
    id: 20,
    text: "Coffee £3.40",
    user: LONDON,
    expect: [{ type: "log_expense", amountMinor: 340 }],
  },
  {
    id: 21,
    text: "Call the plumber at 5pm",
    user: LONDON,
    expect: [{ type: "create_reminder", at: at("2026-10-28T17:00", "+00:00") }],
  },
  {
    id: 22,
    text: "Council tax 140 due 1 Nov",
    user: LONDON,
    expect: [{ type: "add_bill", amountMinor: 14000, dueDate: "2026-11-01" }],
  },
  {
    id: 23,
    text: "Haircut Saturday 11am",
    user: LONDON,
    expect: [{ type: "create_event", at: at("2026-10-31T11:00", "+00:00") }],
  },
  {
    id: 24,
    text: "Mittagessen 12,50",
    user: BERLIN,
    expect: [{ type: "log_expense", amountMinor: 1250 }],
  },
  {
    id: 25,
    text: "Zahnarzt morgen 10 Uhr",
    user: BERLIN,
    expect: [{ type: "create_event", at: at("2026-10-29T10:00", "+01:00") }],
  },
  {
    id: 26,
    text: "Phở 50000",
    user: SAIGON,
    expect: [{ type: "log_expense", amountMinor: 50000 }],
  },
  {
    id: 27,
    text: "Electricity bill 450000 due Nov 10",
    user: SAIGON,
    expect: [{ type: "add_bill", amountMinor: 450000, dueDate: "2026-11-10" }],
  },
  {
    id: 28,
    text: "Kopi 1.80",
    user: SINGAPORE,
    expect: [{ type: "log_expense", amountMinor: 180 }],
  },
  {
    id: 29,
    text: "Remind me in 2 hours to take out the laundry",
    user: SINGAPORE,
    expect: [{ type: "create_reminder", at: at("2026-10-28T12:00", "+08:00") }],
  },
  {
    id: 30,
    text: "Taxi 15 yesterday",
    user: SINGAPORE,
    expect: [{ type: "log_expense", amountMinor: 1500, date: "2026-10-27" }],
  },
];

/** "2026-10-28T20:00:00+08:00" matches local "2026-10-28T20:00" and offset "+08:00". */
function matchesAt(iso: string | undefined, want: { local: string; offset: string }): boolean {
  if (!iso) return false;
  const offset = iso.endsWith("Z") ? "+00:00" : iso.slice(-6);
  return iso.startsWith(want.local) && offset === want.offset;
}

function satisfies(proposal: Proposal, want: Expect): boolean {
  const a = proposal.action;
  if ("anyOf" in want) return a.type === "add_routine_anchor" || a.type === "create_reminder";
  if (a.type !== want.type) return false;
  switch (want.type) {
    case "log_expense":
      return (
        a.type === "log_expense" &&
        a.expense.amount.amountMinor === want.amountMinor &&
        (!want.date || a.expense.occurredAt.startsWith(want.date))
      );
    case "add_bill":
      return (
        a.type === "add_bill" &&
        a.bill.amount.amountMinor === want.amountMinor &&
        a.bill.dueDate === want.dueDate
      );
    case "create_reminder":
      if (a.type !== "create_reminder") return false;
      if (want.at) return matchesAt(a.reminder.dueAt, want.at);
      return !want.date || (a.reminder.dueAt ?? "").startsWith(want.date);
    case "create_event":
      return a.type === "create_event" && matchesAt(a.event.startAt, want.at);
    case "add_note":
      return a.type === "add_note" && a.note.body.toLowerCase().includes(want.contains);
    case "add_medication":
      return a.type === "add_medication" && want.times.every((t) => a.medication.times.includes(t));
  }
}

/** Every expectation met by a distinct proposal; "no tools" cases need none. */
function scoreCase(proposals: Proposal[], expect: Expect[]): boolean {
  if (expect.length === 0) return proposals.length === 0;
  const left = [...proposals];
  return expect.every((want) => {
    const i = left.findIndex((p) => satisfies(p, want));
    if (i === -1) return false;
    left.splice(i, 1);
    return true;
  });
}

/** Wraps a client to count raw tool calls (to see how many failed our schemas). */
function counting(client: LlmClient): { client: LlmClient; rawCalls: () => number } {
  let raw = 0;
  return {
    rawCalls: () => raw,
    client: {
      async generate(request) {
        const result = await client.generate(request);
        raw += result.toolCalls.length;
        return result;
      },
    },
  };
}

/** Retries a rate-limited call after a wait, so limits don't count as model errors. */
function retrying(client: LlmClient): LlmClient {
  return {
    async generate(request) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await client.generate(request);
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "";
          const limited = /429|RESOURCE_EXHAUSTED|rate limit/i.test(message);
          const wait = RETRY_WAITS_MS[attempt];
          if (!limited || wait === undefined) throw caught;
          process.stdout.write("~");
          await pause(wait);
        }
      }
    },
  };
}

function providers(): { name: string; client: LlmClient }[] {
  const env = process.env;
  const list: { name: string; client: LlmClient }[] = [];
  if (env.GROQ_API_KEY) {
    for (const model of ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]) {
      list.push({ name: `groq ${model}`, client: new GroqLlmClient(env.GROQ_API_KEY, model) });
    }
  }
  if (env.GEMINI_API_KEY) {
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    list.push({
      name: `gemini ${model}`,
      client: new GeminiLlmClient(new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }), model),
    });
  }
  if (env.ANTHROPIC_API_KEY) {
    const model = env.LLM_MODEL || "claude-opus-5-5";
    list.push({
      name: `anthropic ${model}`,
      client: new AnthropicLlmClient(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), model),
    });
  }
  return list;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Row = {
  provider: string;
  passed: number;
  errors: number;
  dropped: number;
  medianMs: number;
  failures: string[];
};

async function runQuickAdd(name: string, base: LlmClient, gap: number): Promise<Row> {
  const { client, rawCalls } = counting(base);
  let passed = 0;
  let errors = 0;
  let kept = 0;
  const times: number[] = [];
  const failures: string[] = [];
  for (const c of CASES) {
    const start = Date.now();
    try {
      const { proposals } = await generateQuickAdd(client, { text: c.text, user: c.user }, NOW);
      times.push(Date.now() - start);
      kept += proposals.length;
      if (scoreCase(proposals, c.expect)) passed += 1;
      else failures.push(`#${c.id} "${c.text}" → ${describe(proposals)}`);
    } catch (caught) {
      errors += 1;
      failures.push(
        `#${c.id} "${c.text}" → error: ${caught instanceof Error ? caught.message : "unknown"}`,
      );
    }
    process.stdout.write(".");
    await pause(gap);
  }
  times.sort((a, b) => a - b);
  return {
    provider: name,
    passed,
    errors,
    dropped: rawCalls() - kept,
    medianMs: times[Math.floor(times.length / 2)] ?? 0,
    failures,
  };
}

function describe(proposals: Proposal[]): string {
  if (proposals.length === 0) return "no proposals";
  return proposals
    .map((p) => {
      const a = p.action;
      switch (a.type) {
        case "log_expense":
          return `expense ${a.expense.amount.amountMinor} ${a.expense.amount.currency} @${a.expense.occurredAt}`;
        case "add_bill":
          return `bill ${a.bill.amount.amountMinor} due ${a.bill.dueDate}`;
        case "create_reminder":
          return `reminder ${a.reminder.dueAt ?? "(no time)"}`;
        case "create_event":
          return `event ${a.event.startAt}`;
        default:
          return a.type;
      }
    })
    .join("; ");
}

async function sampleBriefings(name: string, client: LlmClient, gap: number): Promise<string[]> {
  const out: string[] = [];
  for (const user of [MANILA, NEW_YORK]) {
    try {
      const { briefing } = await generateBriefing(
        client,
        "00000000-0000-4000-8000-0000000000de",
        { slot: "morning", contextItems: [], user },
        { now: NOW, date: NOW.slice(0, 10) },
      );
      out.push(`- **${name} · ${user.timezone}** (${briefing.source}): ${briefing.summary}`);
    } catch (caught) {
      out.push(
        `- **${name} · ${user.timezone}**: error ${caught instanceof Error ? caught.message : ""}`,
      );
    }
    await pause(gap);
  }
  return out;
}

async function main(): Promise<void> {
  const outIndex = process.argv.indexOf("--out");
  const outFile = outIndex > -1 ? process.argv[outIndex + 1] : undefined;
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : undefined;
  const list = providers().filter((p) => !only || p.name.startsWith(only));
  if (list.length === 0) {
    console.log("No provider keys found in apps/web/.env.local — nothing to run.");
    return;
  }
  const rows: Row[] = [];
  const briefings: string[] = [];
  for (const { name, client: base } of list) {
    const client = retrying(base);
    const gap = name.startsWith("gemini") ? GEMINI_PAUSE_MS : PAUSE_MS;
    process.stdout.write(`${name} `);
    rows.push(await runQuickAdd(name, client, gap));
    briefings.push(...(await sampleBriefings(name, client, gap)));
    process.stdout.write("\n");
  }
  const report = [
    `# LLM provider check — ${CASES.length} Quick Add cases (run ${new Date().toISOString().slice(0, 10)})`,
    "",
    "| Provider | Correct | Errors | Calls dropped by schema | Median time |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.provider} | ${r.passed}/${CASES.length} | ${r.errors} | ${r.dropped} | ${(r.medianMs / 1000).toFixed(1)} s |`,
    ),
    "",
    ...rows.flatMap((r) => [
      `## Misses — ${r.provider}`,
      ...(r.failures.length ? r.failures.map((f) => `- ${f}`) : ["- none"]),
      "",
    ]),
    "## Sample morning briefings (empty day)",
    ...briefings,
    "",
  ].join("\n");
  if (outFile) writeFileSync(outFile, report);
  console.log(report);
}

void main();
