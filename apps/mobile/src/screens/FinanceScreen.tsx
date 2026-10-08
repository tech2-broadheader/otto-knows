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
import { ExpenseWalletPicker } from "../components/ExpenseWalletPicker";
import { nextBillDueDate } from "@otto/core";
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
  ProposalCard,
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
import { t } from "../i18n";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECENT_LIMIT = 6;

const CADENCE_OPTIONS: { k: IncomeCadence; l: string }[] = [
  { k: "monthly", l: t("money.cadence.monthly") },
  { k: "semi-monthly", l: t("money.cadence.semiMonthly") },
  { k: "biweekly", l: t("money.cadence.biweekly") },
  { k: "weekly", l: t("money.cadence.weekly") },
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
    payBill,
    defaultAccountId,
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
  // Paying a bill (story 11.6): which bill's proposal is open, and its wallet.
  const [payingId, setPayingId] = useState<string | undefined>();
  const [payWallet, setPayWallet] = useState<string | undefined>();
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | undefined>();
  const activeWallets = wallets.perAccount.filter((w) => !w.archived);

  const openPay = (billId: string): void => {
    setPayingId(billId);
    setPayWallet(defaultAccountId);
    setPayError(undefined);
  };

  const confirmPay = async (billId: string, accountId: string | undefined): Promise<void> => {
    setPayBusy(true);
    try {
      await payBill(billId, accountId);
      setPayingId(undefined);
    } catch {
      setPayError(t("money.payBill.error"));
    } finally {
      setPayBusy(false);
    }
  };
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
    if (billName.trim() === "") return setFormError(t("money.home.errors.billName"));
    const minor = amountOrError(billAmount);
    if (minor === null || minor === 0) return setFormError(t("money.home.errors.billAmount"));
    if (!DATE_PATTERN.test(billDue)) return setFormError(t("money.home.errors.billDue"));
    setFormError(undefined);
    const result = await addBill({ name: billName.trim(), amountMinor: minor, dueDate: billDue });
    if (result === "at-cap") return;
    setBillName("");
    setBillAmount("");
  };

  const handleAddCategory = async (): Promise<void> => {
    if (catName.trim() === "") return setFormError(t("money.home.errors.categoryName"));
    let limit: number | undefined;
    if (catLimit.trim() !== "") {
      const parsed = amountOrError(catLimit);
      if (parsed === null) return setFormError(t("money.home.errors.categoryLimit"));
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
        title={t("money.home.title")}
        sub={t("money.home.walletCount", { count: activeAccounts.length })}
        isPro={isPro}
        onUpgrade={goToUpgrade}
        onSettings={() => navigation.navigate("Settings")}
      />

      <View style={{ paddingHorizontal: 18, gap: 18, marginTop: 10 }}>
        <AsyncBoundary
          state={state}
          error={error}
          onRetry={reload}
          loadingLabel={t("money.home.loading")}
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
                    {t("money.home.manage")}
                  </Text>
                </Pressable>
              }
            >
              {t("money.home.wallets")}
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
            <Ring
              pct={pct}
              value={pctLabel}
              label={t("money.home.ofBudget")}
              size={96}
              stroke={11}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.ink500 }}>
                {t("money.home.spentThisMonth")}
              </Text>
              <Display style={{ fontSize: 22, marginTop: 2 }}>
                {money.format(summary.totalSpentMinor)}
              </Display>
              {summary.totalLimitMinor > 0 ? (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  {t("money.home.ofLimit", { amount: money.format(summary.totalLimitMinor) })}
                </Text>
              ) : (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  {t("money.home.addCategoryLimit")}
                </Text>
              )}
              <Pressable
                onPress={() => navigation.navigate("MonthlyReport", { month: currentMonth() })}
                accessibilityRole="link"
                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}
              >
                <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>
                  {t("money.home.monthlyReport")}
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
                  accessibilityLabel={t("money.home.addTransaction")}
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon name="plus" size={14} color={OC.green} stroke={2.6} />
                  <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>
                    {t("money.home.add")}
                  </Text>
                </Pressable>
              }
            >
              {t("money.home.recent")}
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
                  {t("money.home.noTransactions")}
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
                  {isPro
                    ? `${bills.length}`
                    : t("money.home.billsFree", { count: bills.length, cap: FREE_CAPS.bills })}
                </Text>
              }
            >
              {t("money.home.bills")}
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
                  {t("money.home.noBills")}
                </Text>
              ) : (
                bills.map((bill, index) => (
                  <View
                    key={bill.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: index < bills.length - 1 ? 1 : 0,
                      borderBottomColor: OC.line,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <IconTile icon="bell" color={bill.isPaid ? OC.green : OC.sky} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                          {bill.name}
                        </Text>
                        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                          {t("money.home.due", { date: money.shortDate(bill.dueDate) })}
                        </Text>
                      </View>
                      {bill.isPaid ? (
                        <Pill tone="green">{t("money.home.paid")}</Pill>
                      ) : payingId !== bill.id ? (
                        <Pressable
                          onPress={() => openPay(bill.id)}
                          accessibilityRole="button"
                          accessibilityLabel={t("money.payBill.payA11y", { name: bill.name })}
                          hitSlop={6}
                        >
                          <Pill tone="mint">{t("money.payBill.pay")}</Pill>
                        </Pressable>
                      ) : null}
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
                    {payingId === bill.id ? (
                      <View style={{ marginTop: 12 }}>
                        <FormError message={payError} />
                        <ProposalCard
                          icon="wallet"
                          tone="amber"
                          title={t("money.payBill.title", {
                            name: bill.name,
                            amount: money.format(bill.amount.amountMinor),
                          })}
                          detail={(() => {
                            const next = nextBillDueDate(bill);
                            return next
                              ? t("money.payBill.rollsTo", { date: money.shortDate(next) })
                              : t("money.payBill.once");
                          })()}
                          onAccept={payBusy ? undefined : () => void confirmPay(bill.id, payWallet)}
                          onDismiss={payBusy ? undefined : () => setPayingId(undefined)}
                        >
                          <ExpenseWalletPicker
                            wallets={activeWallets}
                            amountMinor={bill.amount.amountMinor}
                            value={payWallet}
                            isLastUsed={payWallet === defaultAccountId}
                            onChange={setPayWallet}
                          />
                          <Pressable
                            onPress={
                              payBusy ? undefined : () => void confirmPay(bill.id, undefined)
                            }
                            accessibilityRole="button"
                            hitSlop={6}
                            style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? 0.6 : 1 })}
                          >
                            <Text
                              style={{ fontFamily: FONT.bodyBold, fontSize: 13, color: OC.green }}
                            >
                              {t("money.payBill.alreadyLogged")}
                            </Text>
                          </Pressable>
                        </ProposalCard>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </Card>
            {billsAtCap ? (
              <View style={{ marginTop: 12 }}>
                <ProGate onUpgrade={goToUpgrade}>
                  <Display style={{ fontSize: 17, color: "#fff" }}>
                    {t("money.home.billLimit", { cap: FREE_CAPS.bills })}
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
            <AddButton label={t("money.home.manageOpen")} onPress={() => setManageOpen(true)} />
          ) : (
            <View style={{ marginTop: 16, gap: 16 }}>
              <FormError message={formError} />

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 6 }}>
                  {t("money.home.income.title")}
                </Display>
                <Text
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12.5,
                    color: OC.ink500,
                    marginBottom: 14,
                  }}
                >
                  {income.length === 0
                    ? t("money.home.income.empty")
                    : income.map((i) => i.source).join(" · ")}
                </Text>
                <Field label={t("money.home.income.source")}>
                  <TextField
                    value={incomeSource}
                    onChangeText={setIncomeSource}
                    placeholder={t("money.egSalary")}
                  />
                </Field>
                <Field label={t("money.home.income.amount")}>
                  <TextField
                    value={incomeAmount}
                    onChangeText={setIncomeAmount}
                    placeholder="0"
                    prefix={money.symbol}
                    keyboardType="decimal-pad"
                  />
                </Field>
                <Field label={t("money.home.income.howOften")}>
                  <ChoicePills
                    options={CADENCE_OPTIONS}
                    value={cadence}
                    onChange={(k) => setCadence(k as IncomeCadence)}
                  />
                </Field>
                {cadence === "semi-monthly" ? (
                  <Field
                    label={t("money.home.income.whichDays")}
                    hint={t("money.home.income.whichDaysHint")}
                  >
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
                <Field label={t("money.home.income.nextPayday")}>
                  <TextField
                    value={nextPayDate}
                    onChangeText={setNextPayDate}
                    placeholder="2026-10-15"
                  />
                </Field>
                <PrimaryButton
                  label={t("money.home.income.add")}
                  onPress={() => void handleAddIncome()}
                />
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  {isPro
                    ? t("money.home.bill.title")
                    : t("money.home.bill.titleCapped", {
                        count: bills.length,
                        cap: FREE_CAPS.bills,
                      })}
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
                    <Field label={t("money.home.bill.name")}>
                      <TextField
                        value={billName}
                        onChangeText={setBillName}
                        placeholder={t("money.home.bill.namePlaceholder")}
                      />
                    </Field>
                    <Field label={t("money.home.bill.amount")}>
                      <TextField
                        value={billAmount}
                        onChangeText={setBillAmount}
                        placeholder="0"
                        prefix={money.symbol}
                        keyboardType="decimal-pad"
                      />
                    </Field>
                    <Field label={t("money.home.bill.dueDate")}>
                      <TextField
                        value={billDue}
                        onChangeText={setBillDue}
                        placeholder="2026-10-15"
                      />
                    </Field>
                    <PrimaryButton
                      label={t("money.home.bill.add")}
                      onPress={() => void handleAddBill()}
                    />
                  </View>
                )}
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  {isPro
                    ? t("money.home.category.title")
                    : t("money.home.category.titleCapped", {
                        count: categories.length,
                        cap: FREE_CAPS.budgetCategories,
                      })}
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
                    <Field label={t("money.home.category.name")}>
                      <TextField
                        value={catName}
                        onChangeText={setCatName}
                        placeholder={t("money.home.category.namePlaceholder")}
                      />
                    </Field>
                    <Field label={t("money.home.category.limit")} hint={t("money.optionalHint")}>
                      <TextField
                        value={catLimit}
                        onChangeText={setCatLimit}
                        placeholder="0"
                        prefix={money.symbol}
                        keyboardType="decimal-pad"
                      />
                    </Field>
                    <PrimaryButton
                      label={t("money.home.category.add")}
                      onPress={() => void handleAddCategory()}
                    />
                  </View>
                )}
              </Card>

              <GhostButton
                label={t("common.done")}
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
