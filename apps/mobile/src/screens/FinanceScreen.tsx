// Finance (story 3.2). Add income / bills / transactions / budget categories and
// show the monthly budget summary (computeBudgetSummary). Free caps enforced with
// a clear upgrade prompt at the cap. Logic lives in useFinance; money is parsed
// to centavos at this UI edge and formatted back for display.
//
// Visual: OTTO Money design (otto/app-screens.jsx FinanceScreen), ported to RN
// inline styles via the design kit — a budget Ring summary card, an amber
// "trending over" note when real spend is pacing past budget, the Bills list,
// Recent transactions, and the add forms revealed inline below. Data logic is
// unchanged (useFinance); only the look is the inline-style kit (reliable on SDK
// 54, unlike the prior NativeWind pass).
import { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { IncomeCadence } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useFinance } from "../hooks/useFinance";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  Screen,
  AppHeader,
  Card,
  SectionLabel,
  Display,
  Pill,
  Ring,
  AddButton,
  Field,
  TextField,
  PrimaryButton,
  GhostButton,
  ProGate,
} from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT, RADIUS, tint } from "../design/theme";
import { formatPeso, parsePesoToCentavos } from "../lib/money";
import { FREE_CAPS, upgradePromptFor } from "../lib/caps";
import { todayDate } from "../lib/datetime";
import { useAuth } from "../auth/AuthProvider";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whole-peso label (no centavos) for the big budget figures. */
function formatPesoWhole(amountMinor: number): string {
  return `₱${Math.round(amountMinor / 100).toLocaleString("en-PH")}`;
}

type Nav = { navigate: (s: "Upgrade" | "Settings") => void };

export function FinanceScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const navigation = useNavigation() as unknown as Nav;
  const goToUpgrade = useUpgradeNavigation();
  const { isPro } = useAuth();
  const finance = useFinance(deps);
  const {
    state,
    error,
    bills,
    income,
    transactions,
    summary,
    billsAtCap,
    categoriesAtCap,
    categories,
    addBill,
    addIncome,
    addTransaction,
    addCategory,
    reload,
  } = finance;

  // Local form state.
  const [showForms, setShowForms] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDue, setBillDue] = useState(todayDate());
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [catName, setCatName] = useState("");
  const [catLimit, setCatLimit] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  const handleAddBill = async (): Promise<void> => {
    const centavos = parsePesoToCentavos(billAmount);
    if (billName.trim().length === 0) return setFormError("Bill needs a name.");
    if (centavos === null) return setFormError("Enter a valid bill amount.");
    if (!DATE_PATTERN.test(billDue)) return setFormError("Due date must be YYYY-MM-DD.");
    setFormError(undefined);
    const result = await addBill({
      name: billName.trim(),
      amountMinor: centavos,
      dueDate: billDue,
    });
    if (result === "at-cap") return;
    setBillName("");
    setBillAmount("");
  };

  const handleAddIncome = async (): Promise<void> => {
    const centavos = parsePesoToCentavos(incomeAmount);
    if (incomeSource.trim().length === 0) return setFormError("Income needs a source.");
    if (centavos === null) return setFormError("Enter a valid income amount.");
    setFormError(undefined);
    const cadence: IncomeCadence = "monthly";
    await addIncome({
      source: incomeSource.trim(),
      amountMinor: centavos,
      cadence,
      nextPayDate: todayDate(),
    });
    setIncomeSource("");
    setIncomeAmount("");
  };

  const handleAddTx = async (): Promise<void> => {
    const centavos = parsePesoToCentavos(txAmount);
    if (centavos === null) return setFormError("Enter a valid transaction amount.");
    setFormError(undefined);
    await addTransaction({ amountMinor: centavos, description: txDesc.trim() });
    setTxAmount("");
    setTxDesc("");
  };

  const handleAddCategory = async (): Promise<void> => {
    if (catName.trim().length === 0) return setFormError("Category needs a name.");
    const limit = catLimit.trim().length > 0 ? parsePesoToCentavos(catLimit) : undefined;
    if (catLimit.trim().length > 0 && limit === null) return setFormError("Enter a valid limit.");
    setFormError(undefined);
    const result = await addCategory({
      name: catName.trim(),
      monthlyLimitMinor: limit ?? undefined,
    });
    if (result === "at-cap") return;
    setCatName("");
    setCatLimit("");
  };

  // Budget ring + over-budget signal, all from the real summary.
  const { pct, pctLabel, remainingMinor, overBudget } = useMemo(() => {
    const limit = summary.totalLimitMinor;
    const spent = summary.totalSpentMinor;
    const fraction = limit > 0 ? spent / limit : 0;
    return {
      pct: fraction,
      pctLabel: limit > 0 ? `${Math.round(fraction * 100)}%` : "—",
      remainingMinor: limit - spent,
      overBudget: summary.categories.some((c) => c.isOverBudget) || (limit > 0 && spent > limit),
    };
  }, [summary]);

  return (
    <Screen>
      <AppHeader
        title="Money"
        sub={`${summary.month} budget`}
        isPro={isPro}
        onUpgrade={() => navigation.navigate("Upgrade")}
        onSettings={() => navigation.navigate("Settings")}
      />

      <View style={{ paddingHorizontal: 18 }}>
        <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading finances">
          {/* Budget ring */}
          <Card style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 18 }}>
            <Ring pct={pct} value={pctLabel} label="of budget" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.ink500 }}>
                Spent this month
              </Text>
              <Display style={{ fontSize: 30, marginTop: 2 }}>
                {formatPesoWhole(summary.totalSpentMinor)}
              </Display>
              {summary.totalLimitMinor > 0 ? (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500, marginTop: 2 }}>
                  of {formatPesoWhole(summary.totalLimitMinor)} ·{" "}
                  <Text style={{ fontFamily: FONT.bodyBold, color: OC.green }}>
                    {formatPesoWhole(Math.max(remainingMinor, 0))} left
                  </Text>
                </Text>
              ) : (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.ink500, marginTop: 2 }}>
                  Add a budget category to track this.
                </Text>
              )}
            </View>
          </Card>

          {/* Trending-over note — only when real spend is pacing over budget */}
          {overBudget ? (
            <View
              style={{
                marginTop: 14,
                backgroundColor: OC.amberBg,
                borderRadius: 16,
                paddingHorizontal: 15,
                paddingVertical: 13,
                flexDirection: "row",
                gap: 11,
                alignItems: "flex-start",
              }}
            >
              <View style={{ marginTop: 1 }}>
                <Icon name="trend" size={20} color={OC.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 13.5, color: OC.amberInk }}>
                  Trending a little over
                </Text>
                <Text
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12.5,
                    lineHeight: 18,
                    color: OC.amberInk,
                    marginTop: 2,
                  }}
                >
                  {isPro
                    ? "Easing off where you can keeps you in range."
                    : "Otto can forecast where this lands — that's a Pro power."}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Bills */}
          <View style={{ marginTop: 22 }}>
            <SectionLabel
              right={
                <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
                  {bills.length} of {FREE_CAPS.bills} free
                </Text>
              }
            >
              Bills
            </SectionLabel>
            <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
              {bills.length === 0 ? (
                <Text style={{ paddingVertical: 16, fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  No bills yet.
                </Text>
              ) : (
                bills.map((bill, index) => {
                  const tone = bill.isPaid ? OC.green : OC.sky;
                  return (
                    <View
                      key={bill.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 13,
                        borderBottomWidth: index < bills.length - 1 ? 1 : 0,
                        borderBottomColor: OC.line,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          backgroundColor: tint(tone),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="peso" size={18} color={tone} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                          {bill.name}
                        </Text>
                        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500, marginTop: 1 }}>
                          Due {bill.dueDate}
                        </Text>
                      </View>
                      {bill.isPaid ? <Pill tone="green">Paid</Pill> : null}
                      <Display style={{ fontSize: 16, fontVariant: ["tabular-nums"] }}>
                        {formatPeso(bill.amount.amountMinor)}
                      </Display>
                    </View>
                  );
                })
              )}
            </Card>
            {billsAtCap ? (
              <View style={{ marginTop: 12 }}>
                <ProGate onUpgrade={goToUpgrade}>
                  <Display style={{ fontSize: 17, color: "#fff", lineHeight: 21 }}>
                    At your {FREE_CAPS.bills}-bill limit
                  </Display>
                  <Text style={{ fontSize: 13.5, color: OC.sage, marginTop: 6, lineHeight: 20, fontFamily: FONT.body }}>
                    {upgradePromptFor("bills")}
                  </Text>
                </ProGate>
              </View>
            ) : null}
          </View>

          {/* Add a bill (opens the inline add forms) */}
          {!showForms ? (
            <AddButton label="Add a bill" onPress={() => setShowForms(true)} />
          ) : null}

          {/* Recent transactions */}
          <View style={{ marginTop: 20 }}>
            <SectionLabel>Recent</SectionLabel>
            <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
              {transactions.length === 0 ? (
                <Text style={{ paddingVertical: 16, fontFamily: FONT.body, fontSize: 13, color: OC.ink500 }}>
                  No transactions yet.
                </Text>
              ) : (
                transactions.slice(0, 6).map((tx, index, arr) => (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                      borderBottomColor: OC.line,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink }}>
                        {tx.description ?? "Transaction"}
                      </Text>
                    </View>
                    <Display style={{ fontSize: 15, fontVariant: ["tabular-nums"] }}>
                      -{formatPeso(tx.amount.amountMinor)}
                    </Display>
                  </View>
                ))
              )}
            </Card>
          </View>

          {/* Add forms (collapsible — keeps every entry path intact) */}
          {showForms ? (
            <View style={{ marginTop: 16, gap: 16 }}>
              {formError ? (
                <View
                  style={{
                    backgroundColor: OC.amberBg,
                    borderRadius: RADIUS.inner,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 9,
                  }}
                >
                  <View style={{ marginTop: 1 }}>
                    <Icon name="trend" size={17} color={OC.amber} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.bodySemi, fontSize: 12.5, lineHeight: 18, color: OC.amberInk }}>
                    {formError}
                  </Text>
                </View>
              ) : null}

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>Add a transaction</Display>
                <Field label="Amount (₱)">
                  <TextField
                    value={txAmount}
                    onChangeText={setTxAmount}
                    placeholder="0.00"
                    prefix="₱"
                  />
                </Field>
                <Field label="Description (optional)">
                  <TextField value={txDesc} onChangeText={setTxDesc} placeholder="e.g. Groceries" />
                </Field>
                <PrimaryButton label="Add transaction" onPress={() => void handleAddTx()} />
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  Bills ({bills.length}/{FREE_CAPS.bills})
                </Display>
                {billsAtCap ? (
                  <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: OC.ink500 }}>
                    {upgradePromptFor("bills")}
                  </Text>
                ) : (
                  <View>
                    <Field label="Bill name">
                      <TextField value={billName} onChangeText={setBillName} placeholder="e.g. Electric" />
                    </Field>
                    <Field label="Amount (₱)">
                      <TextField value={billAmount} onChangeText={setBillAmount} placeholder="0.00" prefix="₱" />
                    </Field>
                    <Field label="Due date (YYYY-MM-DD)">
                      <TextField value={billDue} onChangeText={setBillDue} placeholder="2026-06-16" />
                    </Field>
                    <PrimaryButton label="Add bill" onPress={() => void handleAddBill()} />
                  </View>
                )}
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>
                  Budget categories ({categories.length}/{FREE_CAPS.budgetCategories})
                </Display>
                {categoriesAtCap ? (
                  <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: OC.ink500 }}>
                    {upgradePromptFor("budgetCategories")}
                  </Text>
                ) : (
                  <View>
                    <Field label="Category name">
                      <TextField value={catName} onChangeText={setCatName} placeholder="e.g. Food" />
                    </Field>
                    <Field label="Monthly limit (₱, optional)">
                      <TextField value={catLimit} onChangeText={setCatLimit} placeholder="0.00" prefix="₱" />
                    </Field>
                    <PrimaryButton label="Add category" onPress={() => void handleAddCategory()} />
                  </View>
                )}
              </Card>

              <Card>
                <Display style={{ fontSize: 17, marginBottom: 14 }}>Income ({income.length})</Display>
                <Field label="Source">
                  <TextField value={incomeSource} onChangeText={setIncomeSource} placeholder="e.g. Salary" />
                </Field>
                <Field label="Amount (₱)">
                  <TextField value={incomeAmount} onChangeText={setIncomeAmount} placeholder="0.00" prefix="₱" />
                </Field>
                <PrimaryButton label="Add income" onPress={() => void handleAddIncome()} />
              </Card>

              <GhostButton label="Done" onPress={() => setShowForms(false)} />
            </View>
          ) : null}
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
