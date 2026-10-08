// The English catalog — the source of truth every translation is checked
// against (story 13.3). One file per area of the app.
import { account } from "./account";
import { assistant } from "./assistant";
import { common } from "./common";
import { core } from "./core";
import { money } from "./money";
import { onboarding } from "./onboarding";
import { tasks } from "./tasks";

export const en = { common, onboarding, money, tasks, account, assistant, core } as const;
export type EnglishCatalog = typeof en;
