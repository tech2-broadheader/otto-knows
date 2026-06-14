// ProposalCard — the propose-and-confirm surface (CLAUDE.md §1.11).
//
// Renders one LLM proposal: a human-readable summary of the `action`, the
// model's `rationale`, and Accept / Dismiss buttons. NOTHING is applied until
// the user taps Accept — this component only signals intent up via callbacks.
import { Text, View } from "react-native";
import type { Proposal, ProposalAction } from "@otto/schemas";
import { Button, Card } from "./ui";
import { formatPeso } from "../lib/money";
import { timeLabel } from "../lib/datetime";

/** A friendly action verb + label for each proposal type (for the card header). */
const ACTION_LABEL: Record<ProposalAction["type"], string> = {
  create_reminder: "New reminder",
  log_expense: "Log expense",
  add_bill: "Add bill",
  add_medication: "Add medication",
  block_time: "Block time",
  add_routine_anchor: "Routine anchor",
};

/**
 * One-line plain-language summary of what accepting the proposal will do. Pure —
 * money is formatted at this UI edge via formatPeso (contracts hold centavos).
 */
export function summarizeAction(action: ProposalAction): string {
  switch (action.type) {
    case "create_reminder": {
      const when = action.reminder.dueAt ? ` (${timeLabel(action.reminder.dueAt)})` : "";
      return `${action.reminder.title}${when}`;
    }
    case "log_expense": {
      const note = action.expense.description ? ` · ${action.expense.description}` : "";
      return `${formatPeso(action.expense.amount.amountMinor)}${note}`;
    }
    case "add_bill":
      return `${action.bill.name} — ${formatPeso(action.bill.amount.amountMinor)}, due ${action.bill.dueDate}`;
    case "add_medication": {
      const dose = action.medication.dosage ? ` ${action.medication.dosage}` : "";
      return `${action.medication.name}${dose} at ${action.medication.times.join(", ")}`;
    }
    case "block_time":
      return `${action.block.title} (${timeLabel(action.block.startAt)}–${timeLabel(action.block.endAt)})`;
    case "add_routine_anchor":
      return `${action.anchor.label} at ${action.anchor.time}`;
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
  const summary = summarizeAction(proposal.action);
  return (
    <Card title={label}>
      <Text
        className="text-base font-medium text-slate-900"
        accessibilityLabel={`${label}: ${summary}`}
      >
        {summary}
      </Text>
      <Text className="mt-1 text-sm leading-5 text-slate-500">{proposal.rationale}</Text>
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <Button label="Accept" onPress={() => onAccept(proposal)} disabled={busy} />
        </View>
        <View className="flex-1">
          <Button
            label="Dismiss"
            variant="secondary"
            onPress={() => onDismiss(proposal)}
            disabled={busy}
          />
        </View>
      </View>
    </Card>
  );
}
