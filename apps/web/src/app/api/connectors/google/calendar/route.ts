import { randomUUID } from "node:crypto";
import { z } from "zod";
import { dateSchema } from "@otto/schemas";
import { fail, ok, validateBody } from "@/lib/api";
import { getAuthContext } from "@/server/auth";
import { defaultGoogleCalendarClient, toCalendarEvents } from "@/server/google-calendar";
import { mergeRefreshedToken, needsRefresh, refreshAccessToken } from "@/server/google-oauth";
import { getTokenStore } from "@/server/token-store";

/**
 * GET /api/connectors/google/calendar?date=YYYY-MM-DD — read one day's events.
 *
 * Thin handler (CLAUDE.md §6 / CODING_CONVENTIONS §7): validate the query →
 * auth check → load the stored token → call the client → normalize → envelope.
 *
 * NOTE: per-source CONSENT gating also applies here. Consent records currently
 * live on the mobile device (ARCHITECTURE.md §5 consent domain), so the device
 * is responsible for confirming the user consented to the calendar source before
 * calling this route; server-side consent enforcement lands when consent syncs.
 */

const calendarQuerySchema = z.object({
  date: dateSchema,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = validateBody(calendarQuerySchema, {
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!query.ok) {
    return query.response;
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return fail("UNAUTHORIZED", "Sign in to read your calendar.");
  }

  const store = await getTokenStore();
  if (!store) {
    return fail("INTERNAL", "Google Calendar connection isn't configured on this server.");
  }

  let token = await store.get(auth.context.userId, "google");
  if (!token) {
    // No grant on file — the user must connect Google first via /start.
    return fail("UNAUTHORIZED", "Connect Google Calendar before reading events.");
  }

  // Access tokens last about an hour; refresh with the stored refresh token
  // shortly before expiry instead of failing and making the user reconnect.
  if (needsRefresh(token) && token.refreshToken) {
    const refreshed = await refreshAccessToken(token.refreshToken);
    if (!refreshed.ok) {
      return fail(
        "UNAUTHORIZED",
        "Your Google connection expired. Please reconnect Google Calendar.",
      );
    }
    token = mergeRefreshedToken(token, refreshed.tokens);
    await store.set(auth.context.userId, "google", token);
  }

  let rawEvents: unknown[];
  try {
    rawEvents = await defaultGoogleCalendarClient.listEventsForDay(
      token.accessToken,
      query.data.date,
    );
  } catch {
    // Transport/HTTP failure (incl. expired token). Generic message; no leakage.
    return fail("INTERNAL", "Could not read your Google calendar right now.");
  }

  const events = toCalendarEvents(rawEvents, auth.context.userId, () => randomUUID());
  return ok(events);
}
