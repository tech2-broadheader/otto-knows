import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Response envelope helpers (CODING_CONVENTIONS §7, CLAUDE.md §6).
 *
 * Every API route returns the same two shapes so the frontend can handle them
 * identically everywhere:
 *   success  → { data: T }
 *   failure  → { error: { code, message } }
 */

/** Machine-readable error codes paired with their HTTP status. */
export const ERROR_STATUS = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiError = {
  code: ErrorCode;
  message: string;
};

export type SuccessEnvelope<T> = { data: T };
export type ErrorEnvelope = { error: ApiError };
export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

/** 200 success envelope. Pass `status` to use 201/202 etc. */
export function ok<T>(data: T, status = 200): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Failure envelope. The HTTP status defaults to the canonical status for the
 * given code (e.g. VALIDATION → 400) but can be overridden.
 */
export function fail(
  code: ErrorCode,
  message: string,
  status?: number,
): NextResponse<ErrorEnvelope> {
  return NextResponse.json({ error: { code, message } }, { status: status ?? ERROR_STATUS[code] });
}

/**
 * Result of {@link parseJsonBody}: either the validated, typed value or a ready
 * 400 response describing the validation failure. Discriminate on `ok`.
 */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<ErrorEnvelope> };

/**
 * Validate an already-parsed request body against a Zod schema at the boundary
 * (CLAUDE.md §6). Returns the typed value or a 400 `fail` envelope. Field paths
 * are included in the message; raw input is never echoed back.
 */
export function validateBody<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): ParseResult<z.infer<S>> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const message = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, response: fail("VALIDATION", `Invalid request body: ${message}`) };
}

/**
 * Read and validate a JSON request body in one step. Handles malformed JSON
 * (returns a 400) so handlers never wrap `request.json()` in their own try/catch.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: fail("VALIDATION", "Request body must be valid JSON.") };
  }
  return validateBody(schema, body);
}
