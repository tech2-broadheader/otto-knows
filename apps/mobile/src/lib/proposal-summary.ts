// One-line, plain-language summary of what accepting a proposal will do — the
// title on Quick Add's proposal cards. PURE (unit-tested in Node); money and
// dates are formatted in the user's locale (story 13.1).
import type { ProposalAction } from "@otto/schemas";
import { formatMoney, formatShortDate } from "@otto/core";
import { timeLabel } from "./datetime";
import { t } from "../i18n";

export function summarizeAction(action: ProposalAction, locale: string): string {
  switch (action.type) {
    case "create_reminder": {
      const when = action.reminder.dueAt ? ` (${timeLabel(action.reminder.dueAt)})` : "";
      return `${action.reminder.title}${when}`;
    }
    case "log_expense": {
      const note = action.expense.description ? ` · ${action.expense.description}` : "";
      return `${formatMoney(action.expense.amount, locale)}${note}`;
    }
    case "add_bill":
      return t("assistant.summary.bill", {
        name: action.bill.name,
        amount: formatMoney(action.bill.amount, locale),
        date: formatShortDate(action.bill.dueDate, locale),
      });
    case "add_medication": {
      const times = action.medication.times.join(", ");
      return action.medication.dosage
        ? t("assistant.summary.medicationWithDose", {
            name: action.medication.name,
            dosage: action.medication.dosage,
            times,
          })
        : t("assistant.summary.medication", { name: action.medication.name, times });
    }
    case "block_time":
      return `${action.block.title} (${timeLabel(action.block.startAt)}–${timeLabel(action.block.endAt)})`;
    case "add_routine_anchor":
      return t("assistant.summary.anchor", {
        label: action.anchor.label,
        time: action.anchor.time,
      });
    case "create_event": {
      const where = action.event.location ? ` · ${action.event.location}` : "";
      return `${action.event.title} (${timeLabel(action.event.startAt)})${where}`;
    }
    case "add_note":
      return action.note.title ?? action.note.body.split("\n")[0] ?? action.note.body;
    default: {
      const _exhaustive: never = action;
      return JSON.stringify(_exhaustive);
    }
  }
}
