// Typed client for the web LLM proxy (Phase 2 — "the brain").
//
// Wraps `fetch` against EXPO_PUBLIC_API_URL and unwraps the shared response
// envelope (`{ data } | { error: { code, message } }`, CODING_CONVENTIONS §7).
// It NEVER throws on an HTTP/network error: every outcome is a discriminated
// `ApiResult` the UI switches on, so screens degrade cleanly (sign-in / upgrade
// / try-again) and never crash.
//
// No native/expo imports here — uses the global `fetch` only, so the pure
// envelope-unwrapping logic is unit-tested in Node with a stubbed fetch.
import {
  quickAddResponseSchema,
  type BriefingSlot,
  type ContextItem,
  type Income,
  type Proposal,
  type Routine,
} from "@otto/schemas";

/** Error codes the proxy can return (mirrors the web `ERROR_STATUS` keys). */
export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  // Client-side outcomes (no HTTP exchange or unparseable response).
  | "NOT_CONFIGURED"
  | "NETWORK"
  | "MALFORMED";

/** Discriminated result — success carries typed data, failure carries a code. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ApiErrorCode; message: string };

/** Request body for the proactive briefing (matches the web `briefRequestSchema`). */
export type BriefRequestBody = {
  slot: BriefingSlot;
  contextItems: ContextItem[];
  routine?: Routine;
  incomes?: Income[];
};

/** Shape of a successful brief response (`{ briefing, proposals }`). */
export type BriefData = {
  briefing: unknown;
  proposals: Proposal[];
};

/** Map an HTTP status to our error code when the body lacks a typed envelope. */
function codeForStatus(status: number): ApiErrorCode {
  if (status === 400) return "VALIDATION";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "INTERNAL";
}

/** Read the configured base URL, or `null` when the backend isn't configured. */
export function getApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (!raw || raw.trim() === "") return null;
  return raw.replace(/\/+$/, "");
}

/**
 * POST `body` to `path` and unwrap the envelope into an `ApiResult`. Pure given
 * an injected `fetchImpl` (defaults to the global `fetch`) — this is the piece
 * the unit tests exercise with a stub. Never throws.
 */
export async function postEnvelope<T>(
  path: string,
  body: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === null) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Otto's cloud features aren't set up in this build.",
    };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: "NETWORK", message: "Couldn't reach Otto. Check your connection." };
  }

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    return { ok: false, code: "MALFORMED", message: "Otto sent back an unexpected response." };
  }

  // Failure envelope: `{ error: { code, message } }`.
  if (isErrorEnvelope(envelope)) {
    return { ok: false, code: envelope.error.code, message: envelope.error.message };
  }

  // Non-2xx without a typed error body — synthesize one from the status.
  if (!response.ok) {
    return { ok: false, code: codeForStatus(response.status), message: "Something went wrong." };
  }

  // Success envelope: `{ data: T }`.
  if (isDataEnvelope(envelope)) {
    return { ok: true, data: envelope.data as T };
  }

  return { ok: false, code: "MALFORMED", message: "Otto sent back an unexpected response." };
}

function isErrorEnvelope(
  value: unknown,
): value is { error: { code: ApiErrorCode; message: string } } {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const err = (value as { error: unknown }).error;
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

function isDataEnvelope(value: unknown): value is { data: unknown } {
  return typeof value === "object" && value !== null && "data" in value;
}

/**
 * Natural-language quick-add: POST `{ text }` → validated `Proposal[]`. The
 * proposals are parsed through the shared schema so the UI only ever sees
 * well-formed actions.
 */
export async function quickAdd(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<Proposal[]>> {
  const result = await postEnvelope<unknown>("/api/llm/quick-add", { text }, fetchImpl);
  if (!result.ok) return result;
  const parsed = quickAddResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, code: "MALFORMED", message: "Otto sent back an unexpected response." };
  }
  return { ok: true, data: parsed.data.proposals };
}

/**
 * Proactive briefing: POST the context payload → `{ briefing, proposals }`. The
 * proposals are validated; the briefing is returned as-is (the Today screen reads
 * only its `summary`, and falls back to the local template on any failure).
 */
export async function fetchBrief(
  request: BriefRequestBody,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<BriefData>> {
  return postEnvelope<BriefData>("/api/llm/brief", request, fetchImpl);
}
