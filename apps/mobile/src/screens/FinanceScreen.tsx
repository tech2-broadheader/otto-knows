// Money home (stories 3.2, 11.2–11.5, 13.1, 13.5) — the approved design
// "Money — home": safe-to-spend card, wallets strip, budget ring with the
// monthly-report link, bills, and recent transactions (tap to edit). Income,
// bills and budget categories are managed in the section below. All amounts
// use the user's home currency and locale (useMoney); logic lives in useFinance.
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { IncomeCadence } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useFinance } from "../hooks/useFinance";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { FormError, IconTile, SafeToSpendCard, TxRow, WalletChip } from "../components/money-ui";
import {
  AddButton,
  AppHeader,
  Card,
  ChoicePills,
  Display,
  Field,
  GhostButton,
  Pill,
  PrimaryButton,
  ProGate,
  Ring,
  Screen,
  SectionLabel,
  TextField,
} from "../design/kit";
import { Icon } from "../design/Icon";
import { FONT, OC } from "../design/theme";
import { FREE_CAPS, upgradePromptFor } from "../lib/caps";
import { currentMonth, todayDate } from "../lib/datetime";
import { validateIncomeForm } from "../lib/forms";
import { parseMoneyInput } from "../lib/money";
import { useMoney } from "../lib/settings-context";
import { useAuth } from "../auth/AuthProvider";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECENT_LIMIT = 6;

const CADENCE_OPTIONS: { k: IncomeCadence; l: string }[] = [
  { k: "monthly", l: "Monthly" },
  { k: "semi-monthly", l: "Twice a month" },
  { k: "biweekly", l: "Every 2 weeks" },
  { k: "weekly", l: "Weekly" },
];

type Nav = { navigate: (screen: string, params?: Record<string, string>) => void };

export function FinanceScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const navigation = useNavigation() as unknown as Nav;
  const goToUpgrade = useUpgradeNavigation();
  const { isPro } = useAuth();
  const money = useMoney();
  const finance = useFinance(deps, { isPro });
  const {
    state,
    error,
    bills,
    income,
    transactions,
    categories,
    activeAccounts,
    summary,
    wallets,
    safeToSpend,
    billsAtCap,
    categoriesAtCap,
    addBill,
    addIncome,
    addCategory,
    reload,
  } = finance;

  // Screens pushed on top (add transaction, wallets, report) change data; refresh on return.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [manageOpen, setManageOpen] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDue, setBillDue] = useState(todayDate());
  const [catName, setCatName] = useState("");
  const [catLimit, setCatLimit] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [cadence, setCadence] = useState<IncomeCadence>("monthly");
  const [nextPayDate, setNextPayDate] = useState(todayDate());
  const [firstDay, setFirstDay] = useState("15");
  const [secondDay, setSecondDay] = useState("30");

  const accountName = useMemo(
    () => new Map(finance.accounts.map((a) => [a.id, a.name])),
    [finance.accounts],
  );
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const balanceOf = useMemo(
    () => new Map(wallets.perAccount.map((b) => [b.accountId, b])),
    [wallets.perAccount],
  );

  const { pct, pctLabel } = useMemo(() => {
    const limit = summary.totalLimitMinor;
    const fraction = limit > 0 ? summary.totalSpentMinor / limit : 0;
    return { pct: fraction, pctLabel: limit > 0 ? `${Math.round(fraction * 100)}%` : "—" };
  }, [summary]);

  const amountOrError = (text: string): number | null =>
    parseMoneyInput(text, money.currency, money.locale);

  const handleAddBill = async (): Promise<void> => {
    if (billName.trim() === "") return setFormError("Give the bill a name.");
    const minor = amountOrError(billAmount);
    if (minor === null || minor === 0) return setFormError("Enter the bill amount.");
    if (!DATE_PATTERN.test(billDue)) return setFormError("Use a due date like 2026-10-15.");
    setFormError(undefined);
    const result = await addBill({ name: billName.trim(), amountMinor: minor, dueDate: billDue });
    if (result === "at-cap") return;
    setBillName("");
    setBillAmount("");
  };

  const handleAddCategory = async (): Promise<void> => {
    if (catName.trim() === "") return setFormError("Give the category a name.");
    let limit: number | undefined;
    if (catLimit.trim() !== "") {
      const parsed = amountOrError(catLimit);
      if (parsed === null) return setFormError("Enter a valid monthly limit.");
      limit = parsed;
    }
    setFormError(undefined);
    const result = await addCategory({ name: catName.trim(), monthlyLimitMinor: limit });
    if (result === "at-cap") return;
    setCatName("");
    setCatLimit("");
  };

  const handleAddIncome = async (): Promise<void> => {
    const result = validateIncomeForm(
      {
        source: incomeSource,
        amountText: incomeAmount,
        cadence,
        nextPayDate,
        firstDayText: firstDay,
        secondDayText: secondDay,
      },
      money,
    );
    if (!result.ok) return setFormError(result.error);
    setFormError(undefined);
    await addIncome(result.value);
    setIncomeSource("");
    setIncomeAmount("");
  };

  return (
    <Screen>
      <AppHeader
        title="Money"
        sub={`${activeAccounts.length} wallet${activeAccounts.length === 1 ? "" : "s"}`}
        isPro={isPro}
        onUpgrade={goToUpgrade}
        onSettings={() => navigation.navigate("Settings")}
      />

      <View style={{ paddingHorizontal: 18, gap: 18, marginTop: 10 }}>
        <AsyncBoundary
          state={state}
          error={error}
          onRetry={reload}
          loadingLabel="Loading your money"
        >
          <SafeToSpendCard
            value={safeToSpend}
            onAddPayday={() => setManageOpen(true)}
            onAddTransfer={() => navigation.navigate("AddTransaction", { type: "transfer" })}
          />

          <View style={{ marginTop: 18 }}>
            <SectionLabel
              right={
                <Pressable
                  onPress={() => navigation.navigate("Wallets")}
                  accessibilityRole="link"
                  hitSlop={8}
                >
                  <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>
                    Manage
                  </Text>
                </Pressable>
              }
            >
              Wallets
            </SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            >
              {activeAccounts.map((account) => (
                <WalletChip
                  key={account.id}
                  account={account}
                  balance={balanceOf.get(account.id)}
                  onPress={() => navigation.navigate("WalletForm", { accountId: account.id })}
                />
              ))}
            </ScrollView>
          </View>

          <Card style={{ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Ring pct={pct} value={pctLabel} label="of budget" size={96} stroke={11} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.ink500 }}>
                Spent this month
              </Text>
              <Display style={{ fontSize: 22, marginTop: 2 }}>
                {money.format(summary.totalSpentMinor)}
              </Display>
              {summary.totalLimitMinor > 0 ? (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  of {money.format(summary.totalLimitMinor)}
                </Text>
              ) : (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  Add a category limit to track this.
                </Text>
              )}
              <Pressable
                onPress={() => navigation.navigate("MonthlyReport", { month: currentMonth() })}
                accessibilityRole="link"
                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}
              >
                <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>
                  Monthly report
                </Text>
                <Icon name="chevR" size={14} color={OC.green} stroke={2.4} />
              </Pressable>
            </View>
          </Card>

          <View style={{ marginTop: 18 }}>
            <SectionLabel
              right={
                <Pressable
                  onPress={() => navigation.navigate("AddTransaction")}
                  accessibilityRole="button"
                  accessibilityLabel="Add transaction"
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon name="plus" size={14} color={OC.green} stroke={2.6} />
                  <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>Add</Text>
                </Pressable>
              }
            >
              Recent
            </SectionLabel>
            <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
              {transactions.length === 0 ? (
                <Text
                  style={{
                    paddingVertical: 16,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    color: OC.ink500,
                  }}
                >
                  Nothing yet — tap Add to log your first one.
                </Text>
              ) : (
                transactions
                  .slice(0, RECENT_LIMIT)
                  .map((tx, index, list) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      accountName={accountName.get(tx.accountId)}
                      toAccountName={tx.toAccountId ? accountName.get(tx.toAccountId) : undefined}
                      categoryName={tx.categoryId ? categoryName.get(tx.categoryId) : undefined}
                      last={index === list.length - 1}
                      onPress={() => navigation.navigate("AddTransaction", { txId: tx.id })}
                    />
                  ))
              )}
            </Card>
          </View>

          <View style={{ marginTop: 18 }}>
            <SectionLabel
              right={
                <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
                  {isPro ? `${bills.length}` : `${bills.length} of ${FREE_CAPS.bills} free`}
                </Text>
              }
            >
              Bills
            </SectionLabel>
            <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
              {bills.length === 0 ? (
                <Text
                  style={{
                    paddingVertical: 16,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    color: OC.ink500,
                  }}
                >
                  No bills yet.
                </Text>
              ) : (
                bills.map((bill, index) => (
                  <View
                    key={bill.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: index < bills.length - 1 ? 1 : 0,
                      borderBottomColor: OC.line,
                    }}
                  >
                    <IconTile icon="bell" color={bill.isPaid ? OC.green : OC.sky} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                        {bill.name}
                      </Text>
                      <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                        Due {money.shortDate(bill.dueDate)}
                      </Text>
                    </View>
                    {bill.isPaid ? <Pill tone="green">Paid</Pill> : null}
                    <Text
                      style={{
                        fontFamily: FONT.bodyX,
                        fontSize: 14.5,
                        color: OC.ink,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {money.format(bill.amount.amountMinor)}
                    </Text>
                  </View>
                ))
              )}
            </Card>
            {billsAtCap ? (
              <View style={{ marginTop: 12 }}>
                <ProGate onUpgrade={goToUpgrade}>
                  <Display style={{ fontSize: 17, color: "#fff" }}>
                    At your {FREE_CAPS.bills}-bill limit
                  </Display>
                  <Text
                    style={{
                      fontSize: 13.5,
                      color: OC.sage,
                      marginTop: 6,
                      lineHeight: 20,
                      fontFamily: FONT.body,
                    }}
                  >
                    {upgradePromptFor("bills")}
                  </Text>
                </ProGate>
              </View>
            ) : null}
          </View>

          {!manageOpen ? (
            <AddButton label="Income, bills & categories" onPress={() => setManageOpen(true)} />
          ) : (
            <View style={{ marginTop: 16, gap: 16 }}>
              <FormError message={formError} />

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 6 }}>Income</Display>
                <Text
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12.5,
                    color: OC.ink500,
                    marginBottom: 14,
                  }}
                >
                  {income.length === 0
                    ? "Add your pay so Otto can work out what's safe to spend."
                    : income.map((i) => i.source).join(" · ")}
                </Text>
                <Field label="Source">
                  <TextField
                    value={incomeSource}
                    onChangeText={setIncomeSource}
                    placeholder="e.g. Salary"
                  />
                </Field>
                <Field label="Amount each payday">
                  <TextField
                    value={incomeAmount}
                    onChangeText={setIncomeAmount}
                    placeholder="0"
                    prefix={money.symbol}
                    keyboardType="decimal-pad"
                  />
                </Field>
                <Field label="How often">
                  <ChoicePills
                    options={CADENCE_OPTIONS}
                    value={cadence}
                    onChange={(k) => setCadence(k as IncomeCadence)}
                  />
                </Field>
                {cadence === "semi-monthly" ? (
                  <Field label="Which two days?" hint="31 = end of month">
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <TextField
                          value={firstDay}
                          onChangeText={setFirstDay}
                          placeholder="15"
                          keyboardType="number-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField
                          value={secondDay}
                          onChangeText={setSecondDay}
                          placeholder="30"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </Field>
                ) : null}
                <Field label="Next payday">
                  <TextField
                    value={nextPayDate}
                    onChangeText={setNextPayDate}
                    placeholder="2026-10-15"
                  />
                </Field>
                <PrimaryButton label="Add income" onPress={() => void handleAddIncome()} />
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  {isPro ? "Add a bill" : `Bills (${bills.length}/${FREE_CAPS.bills})`}
                </Display>
                {billsAtCap ? (
                  <Text
                    style={{
                      fontFamily: FONT.body,
                      fontSize: 13,
                      lineHeight: 19,
                      color: OC.ink500,
                    }}
                  >
                    {upgradePromptFor("bills")}
                  </Text>
                ) : (
                  <View>
                    <Field label="Bill name">
                      <TextField
                        value={billName}
                        onChangeText={setBillName}
                        placeholder="e.g. Electric"
                      />
                    </Field>
                    <Field label="Amount">
                      <TextField
                        value={billAmount}
                        onChangeText={setBillAmount}
                        placeholder="0"
                        prefix={money.symbol}
                        keyboardType="decimal-pad"
                      />
                    </Field>
                    <Field label="Due date">
                      <TextField
                        value={billDue}
                        onChangeText={setBillDue}
                        placeholder="2026-10-15"
                      />
                    </Field>
                    <PrimaryButton label="Add bill" onPress={() => void handleAddBill()} />
                  </View>
                )}
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  {isPro
                    ? "Budget categories"
                    : `Budget categories (${categories.length}/${FREE_CAPS.budgetCategories})`}
                </Display>
                {categoriesAtCap ? (
                  <Text
                    style={{
                      fontFamily: FONT.body,
                      fontSize: 13,
                      lineHeight: 19,
                      color: OC.ink500,
                    }}
                  >
                    {upgradePromptFor("budgetCategories")}
                  </Text>
                ) : (
                  <View>
                    <Field label="Category name">
                      <TextField
                        value={catName}
                        onChangeText={setCatName}
                        placeholder="e.g. Food"
                      />
                    </Field>
                    <Field label="Monthly limit" hint="optional">
                      <TextField
                        value={catLimit}
                        onChangeText={setCatLimit}
                        placeholder="0"
                        prefix={money.symbol}
                        keyboardType="decimal-pad"
                      />
                    </Field>
                    <PrimaryButton label="Add category" onPress={() => void handleAddCategory()} />
                  </View>
                )}
              </Card>

              <GhostButton
                label="Done"
                onPress={() => {
                  setManageOpen(false);
                  setFormError(undefined);
                }}
              />
            </View>
          )}
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
