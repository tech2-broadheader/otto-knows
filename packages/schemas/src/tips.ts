// Finance & health tips (Phase 3 / FR-T1, FR-T2). Strictly general and
// supportive — finance tips are informational, not licensed advice; health tips
// are gentle and non-medical, no hard numeric targets, no streak-shaming. The
// tone IS the safety design (spec §6.2).
import { z } from "zod";

export const tipDomainSchema = z.enum(["finance", "health"]);
export type TipDomain = z.infer<typeof tipDomainSchema>;

export const tipsRequestSchema = z.object({
  domain: tipDomainSchema,
});
export type TipsRequest = z.infer<typeof tipsRequestSchema>;

export const tipsResponseSchema = z.object({
  domain: tipDomainSchema,
  tips: z.array(z.string().min(1).max(280)).max(5),
});
export type TipsResponse = z.infer<typeof tipsResponseSchema>;
