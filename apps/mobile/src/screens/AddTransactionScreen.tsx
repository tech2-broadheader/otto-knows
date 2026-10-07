// Add / edit a transaction (stories 11.3, 13.1) — approved design "Add
// transaction": Expense / Income / Transfer switch, amount in the user's
// currency, wallet picker(s) (paying a card = transfer to it), category for
// expenses only, note and date. Route params: { txId } to edit, { type } to
// preselect. Validation is pure (lib/forms) and tested.
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { TransactionType } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../auth/AuthProvider";
import { FormError } from "../components/money-ui";
import { ChoicePills, Field, OverlayScreen, SaveBar, Segmented, TextField } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { todayDate } from "../lib/datetime";
import { dateForChoice, validateTransactionForm } from "../lib/forms";
import { formatMoneyInput } from "../lib/money";
import { useMoney } from "../lib/settings-context";

type Params = { txId?: string; type?: TransactionType };

const TYPE_OPTIONS = [
  { k: "expense", l: "Expense" },
  { k: "income", l: "Income" },
  { k: "transfer", l: "Transfer" },
];

const SAVE_LABEL: Record<TransactionType, string> = {
  expense: "Add expense",
  income: "Add income",
  transfer: "Move money",
};

export function AddTransactionScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const params = (useRoute().params ?? {}) as Params;
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const money = useMoney();
  const finance = useFinance(deps, { isPro });
  const editing = params.txId ? finance.transactions.find((t) => t.id === params.txId) : undefined;

  const [type, setType] = useState<TransactionType>(params.type ?? "expense");
  const [amountText, setAmountText] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>();
  const [toAccountId, setToAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayDate());
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Prefill once data has loaded: the edited transaction, else the default wallet.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || finance.state !== "ready") return;
    if (editing) {
      setType(editing.type);
      setAmountText(formatMoneyInput(editing.amount.amountMinor, money.currency, money.locale));
      setAccountId(editing.accountId);
      setToAccountId(editing.toAccountId);
      setCategoryId(editing.categoryId);
      setNote(editing.description ?? "");
      setDate(editing.occurredAt.slice(0, 10));
    } else {
      setAccountId(finance.defaultAccountId);
    }
    setPrefilled(true);
  }, [editing, finance.defaultAccountId, finance.state, money, prefilled]);

  const walletOptions = useMemo(
    () =>
      finance.activeAccounts
        .filter((a) => (type === "transfer" ? a.type !== "credit_card" : true))
        .map((a) => {
          const balance =
            finance.wallets.perAccount.find((b) => b.accountId === a.id)?.balanceMinor ?? 0;
          const label =
            a.type === "credit_card"
              ? `${a.name} · owes ${money.format(Math.max(-balance, 0))}`
              : `${a.name} · ${money.format(balance)}`;
          return { k: a.id, l: label, tone: a.type === "credit_card" ? "coral" : "green" };
        }),
    [finance.activeAccounts, finance.wallets.perAccount, money, type],
  );
  const destinationOptions = useMemo(
    () =>
      finance.activeAccounts
        .filter((a) => a.id !== accountId)
        .map((a) => ({ k: a.id, l: a.name, tone: a.type === "credit_card" ? "coral" : "green" })),
    [accountId, finance.activeAccounts],
  );
  const categoryOptions = useMemo(
    () => [
      ...finance.categories.map((c) => ({ k: c.id, l: c.name, tone: "amber" })),
      { k: "", l: "None", tone: "green" },
    ],
    [finance.categories],
  );

  const today = todayDate();
  const dateOptions = [
    { k: dateForChoice("today", today), l: "Today" },
    { k: dateForChoice("yesterday", today), l: "Yesterday" },
  ];

  const save = async (): Promise<void> => {
    const result = validateTransactionForm(
      { type, amountText, accountId, toAccountId, categoryId, note, date },
      money,
    );
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setSaving(true);
    try {
      if (editing) await finance.updateTransaction(editing.id, result.value);
      else await finance.addTransaction(result.value);
      navigation.goBack();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (): void => {
    if (!editing) return;
    Alert.alert("Delete this transaction?", "Your wallet balances will update.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void finance.deleteTransaction(editing.id).then(() => navigation.goBack());
        },
      },
    ]);
  };

  return (
    <OverlayScreen
      title={editing ? "Edit transaction" : "Add transaction"}
      onBack={() => navigation.goBack()}
      footer={
        <SaveBar
          label={saving ? "Saving…" : editing ? "Save changes" : SAVE_LABEL[type]}
          disabled={saving}
          onCancel={() => navigation.goBack()}
          onSave={() => void save()}
        />
      }
    >
      <FormError message={error} />
      <View style={{ marginBottom: 16 }}>
        <Segmented
          options={TYPE_OPTIONS}
          value={type}
          onChange={(k) => setType(k as TransactionType)}
        />
      </View>

      <Field label="Amount">
        <TextField
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0"
          prefix={money.symbol}
          big
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label={type === "income" ? "Into wallet" : "From wallet"}>
        <ChoicePills options={walletOptions} value={accountId ?? ""} onChange={setAccountId} />
      </Field>

      {type === "transfer" ? (
        <Field label="To" hint="Paying a card? Pick it here">
          <ChoicePills
            options={destinationOptions}
            value={toAccountId ?? ""}
            onChange={setToAccountId}
          />
        </Field>
      ) : null}

      {type === "expense" ? (
        <Field label="Category">
          <ChoicePills
            options={categoryOptions}
            value={categoryId ?? ""}
            onChange={(k) => setCategoryId(k === "" ? undefined : k)}
          />
        </Field>
      ) : null}

      <Field label="Note" hint="optional">
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder={
            type === "income"
              ? "e.g. Salary"
              : type === "transfer"
                ? "e.g. Card payment"
                : "e.g. Lunch"
          }
        />
      </Field>

      <Field label="Date">
        <ChoicePills options={dateOptions} value={date} onChange={setDate} />
        <View style={{ marginTop: 8 }}>
          <TextField value={date} onChangeText={setDate} placeholder="2026-10-08" />
        </View>
      </Field>

      {editing ? (
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={({ pressed }) => [
            { alignSelf: "center", padding: 12, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.coralInk }}>
            Delete transaction
          </Text>
        </Pressable>
      ) : null}
    </OverlayScreen>
  );
}
