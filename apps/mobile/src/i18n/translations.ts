// Registered translations (story 13.3 AC2). English only at launch (ADR-007,
// decision D3). To add a language: create a file exporting
// `Translation<EnglishCatalog>` (any subset; missing keys fall back to English)
// and register it here by its language code.
import type { EnglishCatalog } from "./en";
import type { Translation } from "./translate";

export const TRANSLATIONS: Readonly<Record<string, Translation<EnglishCatalog>>> = {};
