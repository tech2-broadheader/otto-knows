import { ok } from "@/lib/api";

/** GET /api/health → liveness probe. No auth, no body. */
export function GET() {
  return ok({ status: "ok" as const });
}
