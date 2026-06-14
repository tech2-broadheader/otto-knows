import { describe, expect, it } from "vitest";
import { auditEntrySchema } from "@otto/schemas";
import { buildAuditEntry, shouldAudit } from "./audit";

describe("shouldAudit (pure decision)", () => {
  it.each(["income", "transaction", "bill", "medication", "healthMetric"])(
    "audits sensitive entity %s",
    (entity) => {
      expect(shouldAudit(entity)).toBe(true);
    },
  );

  it.each(["reminder", "routine", "budgetCategory", "calendarEvent", "consent"])(
    "does not audit non-sensitive entity %s",
    (entity) => {
      expect(shouldAudit(entity)).toBe(false);
    },
  );
});

describe("buildAuditEntry (pure)", () => {
  it("builds an entry that validates against auditEntrySchema", () => {
    const entry = buildAuditEntry({
      id: "33333333-3333-4333-8333-333333333333",
      userId: "22222222-2222-4222-8222-222222222222",
      entity: "bill",
      entityId: "44444444-4444-4444-8444-444444444444",
      action: "read",
      actor: "user",
      at: "2026-06-14T08:00:00+08:00",
    });
    expect(() => auditEntrySchema.parse(entry)).not.toThrow();
    expect(entry.action).toBe("read");
    expect(entry.entity).toBe("bill");
  });
});
