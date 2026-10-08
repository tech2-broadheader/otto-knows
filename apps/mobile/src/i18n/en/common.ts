// Shared copy: buttons and labels used across many screens (story 13.3).
export const common = {
  /** Working name (brand open: OD-4). */
  appName: "Otto",
  save: "Save",
  cancel: "Cancel",
  done: "Done",
  delete: "Delete",
  edit: "Edit",
  back: "Go back",
  close: "Close",
  retry: "Try again",
  optional: "Optional",
  notNow: "Not now",
  pro: "PRO",
  upgrade: "Upgrade",
  unlockWithPro: "Unlock with Pro",
  settings: "Settings",
  tabs: { today: "Today", reminders: "Reminders", money: "Money", health: "Health" },
  disclaimer: {
    health: "A gentle nudge — not medical advice.",
    finance: "General guidance, not financial advice.",
  },
  proposal: {
    eyebrow: "Otto proposes",
    accept: "Yes, do it",
    accepted: "Added to your day.",
    dismissed: "Dismissed — no changes made.",
  },
} as const;
