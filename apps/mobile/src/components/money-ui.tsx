// Shared pieces of the approved Budgeting+ screens (design canvas "Otto —
// Budgeting+ & Daily Tasks screens", approved 2026-10-08): the safe-to-spend
// card and its states, wallet cards and rows, transaction rows and the inline
// form error. All money goes through useMoney() — no symbol is hard-coded.
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Account, SafeToSpend, Transaction } from "@otto/schemas";
import type { AccountBalance } from "@otto/core";
import { Card, Display } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS, eyebrow, shadow, tint } from "../design/theme";
import { useMoney } from "../lib/settings-context";

/** Icon + accent per wallet type, shared by every wallet surface. */
export const WALLET_STYLE: Record<
  Account["type"],
  { icon: IconName; color: string; label: string }
> = {
  cash: { icon: "peso", color: OC.green, label: "Cash" },
  ewallet: { icon: "wallet", color: OC.sky, label: "E-wallet" },
  bank: { icon: "shield", color: OC.emerald, label: "Bank" },
  credit_card: { icon: "lock", color: OC.coral, label: "Credit card" },
};

const TX_STYLE: Record<Transaction["type"], { icon: IconName; color: string }> = {
  expense: { icon: "peso", color: OC.amber },
  income: { icon: "trend", color: OC.green },
  transfer: { icon: "refresh", color: OC.sky },
};

// ─────────── Safe-to-spend ───────────

export function SafeToSpendCard({
  value,
  onAddPayday,
  onAddTransfer,
}: {
  value: SafeToSpend;
  onAddPayday: () => void;
  onAddTransfer: () => void;
}): React.JSX.Element {
  const money = useMoney();

  if (value.status === "no-income") {
    return (
      <Pressable
        onPress={onAddPayday}
        accessibilityRole="button"
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: OC.surface,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: OC.lineStrong,
            borderRadius: RADIUS.card,
            padding: 16,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <IconTile icon="cal" color={OC.green} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
            Add your payday
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500, marginTop: 1 }}>
            Otto will show what's safe to spend until then.
          </Text>
        </View>
        <Icon name="chevR" size={18} color={OC.green} />
      </Pressable>
    );
  }

  if (value.status === "needs-payday-update") {
    return (
      <Card pad={16} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconTile icon="refresh" color={OC.skyInk} background={OC.skyBg} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
            When's your next payday?
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500, marginTop: 1 }}>
            Your custom pay date has passed. Update it to keep this accurate.
          </Text>
        </View>
        <Pressable
          onPress={onAddPayday}
          accessibilityRole="button"
          style={{
            backgroundColor: OC.green,
            borderRadius: 11,
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 13 }}>Update</Text>
        </Pressable>
      </Card>
    );
  }

  const payday = value.nextPayday ? money.shortDate(value.nextPayday) : "";

  if (value.safeMinor < 0) {
    return (
      <Card pad={16}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <IconTile icon="clock" color={OC.amberInk} background={OC.amberBg} />
          <View style={{ flex: 1 }}>
            <Display style={{ fontSize: 17 }}>Heads up before payday</Display>
            <Text
              style={{
                fontFamily: FONT.body,
                fontSize: 13.5,
                lineHeight: 20,
                color: OC.ink700,
                marginTop: 4,
              }}
            >
              Bills before {payday} are{" "}
              <Text style={{ fontFamily: FONT.bodyBold }}>
                {money.format(-value.safeMinor)} more
              </Text>{" "}
              than what's on hand. A transfer from savings would cover it.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onAddTransfer}
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              marginTop: 12,
              borderWidth: 1.5,
              borderColor: OC.lineStrong,
              borderRadius: RADIUS.btn,
              paddingVertical: 10,
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 13.5, color: OC.ink700 }}>
            Add a transfer
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <LinearGradient
      colors={[OC.dark, OC.dark2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: RADIUS.card, padding: 18 }, shadow("lg")]}
    >
      <View
        accessible
        accessibilityLabel={`Safe to spend: ${money.format(value.safeMinor)} until ${payday}, about ${money.format(value.perDayMinor ?? 0)} a day`}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={[eyebrow, { color: OC.sage }]}>Safe to spend</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="cal" size={14} color={OC.emerald} />
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12, color: OC.mint }}>
              Payday {payday}
            </Text>
          </View>
        </View>
        <Display style={{ color: "#fff", fontSize: 40, lineHeight: 44, marginTop: 10 }}>
          {money.format(value.safeMinor)}
        </Display>
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 14,
            color: "rgba(255,255,255,.88)",
            marginTop: 6,
          }}
        >
          about{" "}
          <Text style={{ fontFamily: FONT.bodyBold, color: "#fff" }}>
            {money.format(value.perDayMinor ?? 0)} a day
          </Text>
          {value.daysUntilPayday ? ` for the next ${value.daysUntilPayday} days` : " — it's payday"}
        </Text>
        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,.12)",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Breakdown label="On hand" value={money.format(value.onHandMinor)} />
          <Breakdown
            label="Bills by payday"
            value={`−${money.format(value.billsBeforePaydayMinor)}`}
          />
          <Breakdown label="Card owed" value={`−${money.format(value.cardOwedMinor)}`} />
        </View>
      </View>
    </LinearGradient>
  );
}

function Breakdown({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11, color: OC.sage }}>{label}</Text>
      <Text
        style={{ fontFamily: FONT.bodyX, fontSize: 13.5, color: "#fff", marginTop: 2 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ─────────── Wallets ───────────

export function IconTile({
  icon,
  color,
  background,
  size = 38,
}: {
  icon: IconName;
  color: string;
  background?: string;
  size?: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: background ?? tint(color),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.47)} color={color} />
    </View>
  );
}

/** Compact wallet card for the Money home strip. */
export function WalletChip({
  account,
  balance,
  onPress,
}: {
  account: Account;
  balance: AccountBalance | undefined;
  onPress: () => void;
}): React.JSX.Element {
  const money = useMoney();
  const style = WALLET_STYLE[account.type];
  const amount = balance?.balanceMinor ?? 0;
  const isCard = account.type === "credit_card";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}: ${isCard ? `owes ${money.format(Math.max(-amount, 0))}` : money.format(amount)}`}
      style={({ pressed }) => [
        {
          width: 132,
          backgroundColor: OC.surface,
          borderWidth: 1,
          borderColor: OC.line,
          borderRadius: 16,
          padding: 12,
          opacity: pressed ? 0.8 : 1,
        },
        shadow("sm"),
      ]}
    >
      <IconTile icon={style.icon} color={style.color} size={30} />
      <Text
        style={{ marginTop: 9, fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.ink500 }}
        numberOfLines={1}
      >
        {account.name}
      </Text>
      {isCard ? (
        <Text
          style={{ fontFamily: FONT.display, fontSize: 17, color: OC.coralInk }}
          numberOfLines={1}
        >
          {money.format(Math.max(-amount, 0))}
        </Text>
      ) : (
        <Text style={{ fontFamily: FONT.display, fontSize: 17, color: OC.ink }} numberOfLines={1}>
          {money.format(amount)}
        </Text>
      )}
    </Pressable>
  );
}

// ─────────── Transactions ───────────

export function TxRow({
  tx,
  accountName,
  toAccountName,
  categoryName,
  last,
  onPress,
}: {
  tx: Transaction;
  accountName: string | undefined;
  toAccountName: string | undefined;
  categoryName: string | undefined;
  last: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const money = useMoney();
  const style = TX_STYLE[tx.type];
  const date = money.shortDate(tx.occurredAt.slice(0, 10));
  const title =
    tx.description ??
    (tx.type === "transfer"
      ? `${accountName ?? "Wallet"} → ${toAccountName ?? "Wallet"}`
      : tx.type === "income"
        ? "Income"
        : (categoryName ?? "Expense"));
  const sub = [
    tx.type === "expense"
      ? (categoryName ?? "Expense")
      : tx.type === "income"
        ? "Income"
        : "Transfer",
    tx.type === "transfer" ? undefined : accountName,
    date,
  ]
    .filter(Boolean)
    .join(" · ");
  const amount = money.format(tx.amount.amountMinor);
  const signed =
    tx.type === "expense" ? `−${amount}` : tx.type === "income" ? `+${amount}` : amount;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${signed}, ${sub}. Edit`}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 11,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: OC.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <IconTile icon={style.icon} color={style.color} size={36} />
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: FONT.bodyX,
          fontSize: 14.5,
          color: tx.type === "income" ? OC.green : tx.type === "transfer" ? OC.ink500 : OC.ink,
          fontVariant: ["tabular-nums"],
        }}
      >
        {signed}
      </Text>
    </Pressable>
  );
}

// ─────────── Form error ───────────

export function FormError({ message }: { message: string | undefined }): React.JSX.Element | null {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: OC.amberBg,
        borderRadius: RADIUS.inner,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: "row",
        gap: 9,
        alignItems: "flex-start",
        marginBottom: 14,
      }}
    >
      <Icon name="clock" size={17} color={OC.amber} />
      <Text
        style={{
          flex: 1,
          fontFamily: FONT.bodySemi,
          fontSize: 13,
          lineHeight: 18,
          color: OC.amberInk,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
