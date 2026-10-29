import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomMutation, zCustomQuery } from "convex-helpers/server/zod3";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Function builders whose `args` are Zod schemas from @otto/schemas, so every
 * input is validated with the shared contract (story 14.1 AC2). Internal only:
 * no app can call these until sign-in adds identity checks (story 14.2).
 */
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);
