// @otto/schemas — the shared Zod contracts (CLAUDE.md §1.2).
// Story 1.2 fills the real entity schemas (Routine, Reminder, Bill, etc.).
// This placeholder proves the package wiring; replace `appInfoSchema` in 1.2.
import { z } from "zod";

export const appInfoSchema = z.object({
  name: z.literal("otto"),
  version: z.string(),
});

export type AppInfo = z.infer<typeof appInfoSchema>;
