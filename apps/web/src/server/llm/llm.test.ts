import { describe, expect, it } from "vitest";
import type { LlmClient, LlmResult } from "./client";
import { proposalTools, toolCallToProposal } from "./tools";
import { quickAddSystem } from "./prompts";
import { generateBriefing } from "./brief";
import { generateQuickAdd } from "./quick-add";

const clock = { now: "2026-06-14T08:00:00.000Z", date: "2026-06-14" };
const counter = () => {
  let n = 0;
  return () => `${(++n).toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
};

function stub(result: Partial<LlmResult>): LlmClient {
  return {
    async generate() {
      return {
        text: "",
        toolCalls: [],
        refused: false,
        usage: { inputTokens: 10, outputTokens: 5 },
        ...result,
      };
    },
  };
}

describe("toolCallToProposal", () => {
  it("maps an add_note call to a note proposal (story 12.1)", () => {
    const proposal = toolCallToProposal(
      { name: "add_note", input: { rationale: "So you won't forget.", body: "Buy gift for Ana" } },
      counter(),
      "PHP",
    );
    expect(proposal?.action).toEqual({ type: "add_note", note: { body: "Buy gift for Ana" } });
  });

  it("rejects an add_note call with an empty body", () => {
    expect(
      toolCallToProposal({ name: "add_note", input: { body: "" } }, counter(), "PHP"),
    ).toBeNull();
  });

  it("maps a create_event call to an appointment proposal (story 12.4)", () => {
    const proposal = toolCallToProposal(
      {
        name: "create_event",
        input: {
          rationale: "You mentioned a dentist visit.",
          title: "Dentist",
          startAt: "2026-10-13T15:00:00+08:00",
          durationMinutes: 60,
          remindMinutesBefore: 60,
        },
      },
      counter(),
      "PHP",
    );
    expect(proposal?.action.type).toBe("create_event");
  });

  it("rejects a create_event call with no end or duration", () => {
    const call = {
      name: "create_event",
      input: { title: "Dentist", startAt: "2026-10-13T15:00:00+08:00" },
    };
    expect(toolCallToProposal(call, counter(), "PHP")).toBeNull();
  });

  it("offers the add_note tool to the model", () => {
    expect(proposalTools("PHP").map((t) => t.name)).toContain("add_note");
    expect(proposalTools("PHP").map((t) => t.name)).toContain("create_event");
  });

  it("maps a valid create_reminder call to a proposal", () => {
    const proposal = toolCallToProposal(
      {
        name: "create_reminder",
        input: {
          rationale: "It's due tonight.",
          title: "Pay electric",
          dueAt: "2026-06-14T20:00:00+08:00",
        },
      },
      counter(),
      "PHP",
    );
    expect(proposal?.action.type).toBe("create_reminder");
    expect(proposal?.rationale).toBe("It's due tonight.");
    expect(proposal?.status).toBe("proposed");
  });

  it("returns null for an unknown tool and for invalid input", () => {
    expect(toolCallToProposal({ name: "nuke", input: {} }, counter(), "PHP")).toBeNull();
    // add_bill missing required fields → fails the draft schema
    expect(
      toolCallToProposal({ name: "add_bill", input: { rationale: "x" } }, counter(), "PHP"),
    ).toBeNull();
  });
});

describe("generateBriefing", () => {
  it("uses the LLM text and surfaces tool calls as proposals", async () => {
    const llm = stub({
      text: "Good morning. One thing today: your dentist at 2pm.",
      toolCalls: [
        {
          name: "create_reminder",
          input: {
            rationale: "So you don't forget.",
            title: "Leave for dentist",
            dueAt: "2026-06-14T13:30:00+08:00",
          },
        },
      ],
    });
    const res = await generateBriefing(
      llm,
      "00000000-0000-4000-8000-0000000000de",
      { slot: "morning", contextItems: [] },
      clock,
    );
    expect(res.briefing.source).toBe("llm");
    expect(res.briefing.summary).toContain("dentist");
    expect(res.proposals).toHaveLength(1);
  });

  it("falls back to a template briefing on refusal", async () => {
    const llm = stub({ refused: true });
    const res = await generateBriefing(
      llm,
      "00000000-0000-4000-8000-0000000000de",
      { slot: "evening", contextItems: [] },
      clock,
    );
    expect(res.briefing.source).toBe("template");
    expect(res.proposals).toEqual([]);
  });
});

describe("generateQuickAdd", () => {
  it("returns proposals from tool calls", async () => {
    const llm = stub({
      toolCalls: [
        {
          name: "add_medication",
          input: {
            rationale: "From your note.",
            name: "Vitamin D",
            times: ["08:00"],
            recurrence: { freq: "daily" },
          },
        },
      ],
    });
    const res = await generateQuickAdd(llm, { text: "vitamin D every morning" }, clock.now);
    expect(res.proposals).toHaveLength(1);
    expect(res.proposals[0]?.action.type).toBe("add_medication");
  });

  it("returns no proposals on refusal", async () => {
    const res = await generateQuickAdd(stub({ refused: true }), { text: "..." }, clock.now);
    expect(res.proposals).toEqual([]);
  });
});

describe("the user's timezone and currency (story 13.2)", () => {
  type Request = Parameters<LlmClient["generate"]>[0];
  function capturing(result: Partial<LlmResult>): { llm: LlmClient; seen: Request[] } {
    const seen: Request[] = [];
    const base = stub(result);
    return {
      seen,
      llm: {
        async generate(request) {
          seen.push(request);
          return base.generate(request);
        },
      },
    };
  }
  const expense = {
    name: "log_expense",
    input: {
      rationale: "From your note.",
      amount: { amountMinor: 1250 },
      description: "Lunch",
      occurredAt: "2026-06-15T12:30:00-04:00",
    },
  };
  const newYork = { timezone: "America/New_York", currency: "USD", locale: "en-US" } as const;

  it("quick-add tells the model the user's zone, offset and currency, and only offers that currency", async () => {
    const { llm, seen } = capturing({ toolCalls: [expense] });
    const res = await generateQuickAdd(llm, { text: "lunch 12.50", user: newYork }, clock.now);
    const request = seen[0]!;
    expect(request.system).toContain("America/New_York");
    expect(request.system).not.toContain("Manila");
    expect(request.system).toContain("USD");
    expect(request.userText).toContain("-04:00");
    expect(JSON.stringify(request.tools)).toContain('"enum":["USD"]');
    const action = res.proposals[0]?.action;
    expect(action?.type === "log_expense" && action.expense.amount.currency).toBe("USD");
  });

  it("keeps Manila and pesos for requests from older apps", async () => {
    const { llm, seen } = capturing({ toolCalls: [expense] });
    const res = await generateQuickAdd(llm, { text: "lunch 12.50" }, clock.now);
    expect(seen[0]!.system).toContain("Asia/Manila");
    const action = res.proposals[0]?.action;
    expect(action?.type === "log_expense" && action.expense.amount.currency).toBe("PHP");
  });

  it("the briefing uses the user's zone and currency too", async () => {
    const { llm, seen } = capturing({ text: "Morning.", toolCalls: [expense] });
    const res = await generateBriefing(
      llm,
      "00000000-0000-4000-8000-0000000000de",
      {
        slot: "morning",
        contextItems: [],
        user: { timezone: "Europe/London", currency: "GBP", locale: "en-GB" },
      },
      clock,
    );
    expect(seen[0]!.system).toContain("Europe/London");
    expect(seen[0]!.system).not.toContain("+08:00");
    const action = res.proposals[0]?.action;
    expect(action?.type === "log_expense" && action.expense.amount.currency).toBe("GBP");
  });

  it("explains minor units per currency, including ones without decimals", () => {
    const vnd = quickAddSystem({ timezone: "Asia/Ho_Chi_Minh", offset: "+07:00", currency: "VND" });
    expect(vnd).toContain("50000 VND → amountMinor 50000");
    const usd = quickAddSystem({ timezone: "America/New_York", offset: "-04:00", currency: "USD" });
    expect(usd).toContain("100 USD → amountMinor 10000");
  });
});
