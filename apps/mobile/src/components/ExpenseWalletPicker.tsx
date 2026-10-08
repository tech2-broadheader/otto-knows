// Quick Add → "Paid from" inside an expense proposal (story 11.3 AC5; approved
// design 2026-10-08). Wallet pills with their balances, then the chosen
// wallet's balance after this expense. Credit cards show no balance in the pill
// (they hold debt, not money on hand).
import { Text, View } from "react-native";
import type { AccountBalance } from "@otto/core";
import { ChoicePills } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { useMoney } from "../lib/settings-context";
import { t } from "../i18n";

export function ExpenseWalletPicker({
  wallets,
  amountMinor,
  value,
  isLastUsed,
  onChange,
}: {
  /** Active wallets only. */
  wallets: readonly AccountBalance[];
  amountMinor: number;
  value: string | undefined;
  isLastUsed: boolean;
  onChange: (accountId: string) => void;
}): React.JSX.Element {
  const money = useMoney();
  const chosen = wallets.find((w) => w.accountId === value);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.ink700 }}>
          {t("money.picker.paidFrom")}
        </Text>
        {isLastUsed ? (
          <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink500 }}>
            {t("money.picker.lastUsed")}
          </Text>
        ) : null}
      </View>
      <ChoicePills
        options={wallets.map((w) => ({
          k: w.accountId,
          l: w.type === "credit_card" ? w.name : `${w.name} ${money.format(w.balanceMinor)}`,
          icon: w.accountId === value ? "check" : undefined,
        }))}
        value={value ?? ""}
        onChange={onChange}
      />
      {chosen ? (
        <Text
          style={{
            marginTop: 10,
            textAlign: "right",
            fontFamily: FONT.body,
            fontSize: 12.5,
            color: OC.ink500,
          }}
        >
          {chosen.type === "credit_card"
            ? t("money.picker.owedAfter", { name: chosen.name })
            : t("money.picker.after", { name: chosen.name })}
          <Text style={{ fontFamily: FONT.bodyX, color: OC.ink }}>
            {chosen.type === "credit_card"
              ? money.format(amountMinor - chosen.balanceMinor)
              : money.format(chosen.balanceMinor - amountMinor)}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}
