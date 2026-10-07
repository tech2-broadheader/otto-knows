// ProposalCard — the propose-and-confirm surface (CLAUDE.md §1.11).
//
// Renders one LLM proposal: a human-readable summary of the `action`, the
// model's `rationale`, and Accept / Dismiss buttons. NOTHING is applied until
// the user taps Accept — this component only signals intent up via callbacks.
import { Pressable, Text, View } from "react-native";
import type { Proposal, ProposalAction } from "@otto/schemas";
import { Icon, OC, toneColor, type IconName, type OttoTone } from "./ui";
import { formatMoney } from "@otto/core";
import { useSettings } from "../lib/settings-context";
import { timeLabel } from "../lib/datetime";

/** A friendly action verb + label for each proposal type (for the card header). */
const ACTION_LABEL: Record<ProposalAction["type"], string> = {
  create_reminder: "New reminder",
  log_expense: "Log expense",
  add_bill: "Add bill",
  add_medication: "Add medication",
  block_time: "Block time",
  add_routine_anchor: "Routine anchor",
  add_note: "Save note",
  create_event: "New appointment",
};

/** Icon + accent tone per proposal type, matching the design's proposal cards. */
const ACTION_ICON: Record<ProposalAction["type"], { icon: IconName; tone: OttoTone }> = {
  create_reminder: { icon: "bell", tone: "green" },
  log_expense: { icon: "peso", tone: "green" },
  add_bill: { icon: "wallet", tone: "amber" },
  add_medication: { icon: "pill", tone: "green" },
  block_time: { icon: "cal", tone: "sky" },
  add_routine_anchor: { icon: "dumbbell", tone: "green" },
  add_note: { icon: "sparkle", tone: "sky" },
  create_event: { icon: "cal", tone: "sky" },
};

/**
 * One-line plain-language summary of what accepting the proposal will do. Pure —
 * money is formatted at this UI edge in the user's locale (contracts hold minor units).
 */
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
      return `${action.bill.name} — ${formatMoney(action.bill.amount, locale)}, due ${action.bill.dueDate}`;
    case "add_medication": {
      const dose = action.medication.dosage ? ` ${action.medication.dosage}` : "";
      return `${action.medication.name}${dose} at ${action.medication.times.join(", ")}`;
    }
    case "block_time":
      return `${action.block.title} (${timeLabel(action.block.startAt)}–${timeLabel(action.block.endAt)})`;
    case "add_routine_anchor":
      return `${action.anchor.label} at ${action.anchor.time}`;
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

export function ProposalCard({
  proposal,
  onAccept,
  onDismiss,
  busy = false,
}: {
  proposal: Proposal;
  onAccept: (proposal: Proposal) => void;
  onDismiss: (proposal: Proposal) => void;
  busy?: boolean;
}): React.JSX.Element {
  const label = ACTION_LABEL[proposal.action.type];
  const { locale } = useSettings();
  const summary = summarizeAction(proposal.action, locale);
  const { icon, tone } = ACTION_ICON[proposal.action.type];
  const accent = toneColor(tone);
  return (
    <View className="overflow-hidden rounded-[18px] border-[1.5px] border-line-strong bg-surface">
      <View className="flex-row gap-3 px-4 pb-3 pt-[15px]">
        <View
          className="h-10 w-10 items-center justify-center rounded-inner"
          style={{ backgroundColor: `${accent}1a` }}
        >
          <Icon name={icon} size={20} color={accent} />
        </View>
        <View className="flex-1">
          <Text className="font-mono-bold text-[10.5px] uppercase tracking-[1px] text-ink-400">
            Otto proposes
          </Text>
          <Text
            className="mt-0.5 font-display text-[16.5px] leading-5 text-ink"
            accessibilityLabel={`${label}: ${summary}`}
          >
            {summary}
          </Text>
          <Text className="mt-1 font-body text-[13px] leading-[19px] text-ink-500">
            {proposal.rationale}
          </Text>
        </View>
      </View>
      <View className="flex-row border-t border-line">
        <Pressable
          onPress={() => onDismiss(proposal)}
          disabled={busy}
          className="flex-1 items-center border-r border-line py-[13px]"
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text className="font-body-bold text-[14px] text-ink-500">Not now</Text>
        </Pressable>
        <Pressable
          onPress={() => onAccept(proposal)}
          disabled={busy}
          className="flex-row items-center justify-center gap-1.5 py-[13px]"
          style={{ flex: 1.4 }}
          accessibilityRole="button"
          accessibilityLabel="Yes, do it"
        >
          <Icon name="check" size={17} color={OC.green} />
          <Text className="font-body-extra text-[14px] text-green">Yes, do it</Text>
        </Pressable>
      </View>
    </View>
  );
}
