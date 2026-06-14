import { describe, expect, it } from "vitest";
import type { LlmClient, LlmResult } from "./client";
import { generateOptimization } from "./optimizer";
import { generateTips, parseTips } from "./tips";

const U = (n: number) => `${n.toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
const ISO = "2026-06-14T08:00:00+08:00";

function stub(result: Partial<LlmResult>): LlmClient {
  return {
    async generate() {
      return {
        text: "",
        toolCalls: [],
        refused: false,
        usage: { inputTokens: 1, outputTokens: 1 },
        ...result,
      };
    },
  };
}

const request = {
  routine: {
    id: U(1),
    userId: U(99),
    mode: "fixed" as const,
    timezone: "Asia/Manila",
    anchors: [
      {
        id: U(2),
        label: "Wind-down",
        kind: "wind-down" as const,
        time: "21:00",
        recurrence: { freq: "daily" as const },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    createdAt: ISO,
    updatedAt: ISO,
  },
  newRoutine: {
    label: "Workout",
    kind: "exercise" as const,
    durationMinutes: 30,
    recurrence: { freq: "weekdays" as const },
  },
};

describe("generateOptimization", () => {
  it("returns the proposal from the forced tool call", async () => {
    const llm = stub({
      toolCalls: [
        {
          name: "propose_schedule",
          input: {
            summary: "Mornings are tight, so I moved your wind-down earlier to fit a workout.",
            changes: [
              {
                action: "add",
                label: "Workout",
                kind: "exercise",
                toTime: "06:30",
                reason: "Your only free morning block.",
              },
              {
                action: "move",
                label: "Wind-down",
                kind: "wind-down",
                anchorId: U(2),
                fromTime: "21:00",
                toTime: "21:30",
                reason: "Shift to balance the day.",
              },
            ],
          },
        },
      ],
    });
    const res = await generateOptimization(llm, request);
    expect(res?.proposal.changes).toHaveLength(2);
    expect(res?.proposal.changes[0]?.action).toBe("add");
  });

  it("returns null on refusal or a malformed proposal", async () => {
    expect(await generateOptimization(stub({ refused: true }), request)).toBeNull();
    expect(
      await generateOptimization(
        stub({ toolCalls: [{ name: "propose_schedule", input: { summary: "x", changes: [] } }] }),
        request,
      ),
    ).toBeNull(); // changes must be non-empty
  });
});

describe("tips", () => {
  it("parses newline tips and strips bullets/numbering", () => {
    expect(
      parseTips("- Save a little each payday\n1. Track one category\n\n• Round up purchases"),
    ).toEqual(["Save a little each payday", "Track one category", "Round up purchases"]);
  });

  it("generates tips from model text and empties on refusal", async () => {
    const res = await generateTips(stub({ text: "Drink water\nTake short walks" }), {
      domain: "health",
    });
    expect(res.domain).toBe("health");
    expect(res.tips).toHaveLength(2);
    expect((await generateTips(stub({ refused: true }), { domain: "finance" })).tips).toEqual([]);
  });
});
