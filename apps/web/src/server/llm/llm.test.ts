import { describe, expect, it } from "vitest";
import type { LlmClient, LlmResult } from "./client";
import { toolCallToProposal } from "./tools";
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
    );
    expect(proposal?.action.type).toBe("create_reminder");
    expect(proposal?.rationale).toBe("It's due tonight.");
    expect(proposal?.status).toBe("proposed");
  });

  it("returns null for an unknown tool and for invalid input", () => {
    expect(toolCallToProposal({ name: "nuke", input: {} }, counter())).toBeNull();
    // add_bill missing required fields → fails the draft schema
    expect(
      toolCallToProposal({ name: "add_bill", input: { rationale: "x" } }, counter()),
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
