// Shared, calm messaging for the Pro LLM surfaces (optimizer + tips).
//
// Pro features call the web LLM proxy, which enforces Pro server-side and may
// 401 (sign in) / 403 (upgrade) / 429 (slow down). The live entitlement
// (useAuth().isPro) also gates the entry points. These helpers turn an outcome into a friendly banner
// so a non-Pro / signed-out / unconfigured / offline state never crashes a screen
// (CLAUDE.md §1.11, §6 — friendly user messages; the proxy carries the detail).
import { t } from "../i18n";
import type { ApiErrorCode } from "./api-client";

export type Banner = { tone: "info" | "warning"; text: string };

/** The calm gate shown when the feature is locked before any request is made. */
export function proGateBanner(featureLabel: string): Banner {
  return {
    tone: "info",
    text: t("account.pro.gate", { feature: featureLabel }),
  };
}

/** Map an API error code to a banner tone + message for a Pro surface. */
export function proErrorBanner(code: ApiErrorCode | undefined, message: string): Banner {
  switch (code) {
    case "FORBIDDEN":
      return { tone: "info", text: t("account.pro.forbidden", { message }) };
    case "UNAUTHORIZED":
      return { tone: "info", text: t("account.pro.unauthorized") };
    case "RATE_LIMITED":
      return { tone: "warning", text: t("account.pro.rateLimited") };
    case "NOT_CONFIGURED":
      return { tone: "info", text: t("account.pro.notConfigured") };
    default:
      return { tone: "warning", text: message };
  }
}
