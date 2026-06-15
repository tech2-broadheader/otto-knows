// Finance (story 3.2). Add income / bills / transactions / budget categories and
// show the monthly budget summary (computeBudgetSummary). Free caps enforced with
// a clear upgrade prompt at the cap. Logic lives in useFinance; money is parsed
// to centavos at this UI edge and formatted back for display.
//
// Visual: OTTO Money design — a budget Ring summary card, an amber "trending
// over" note when real spend is pacing past budget, the Bills list, Recent
// transactions, and the add forms revealed inline below.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { IncomeCadence } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useFinance } from "../hooks/useFinance";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Banner, Button, Card, Icon, LabeledInput, OC, Pill, SectionLabel } from "../components/ui";
import { Ring, ScreenContainer, ScreenHeader } from "../components/otto-ui";
import { formatPeso, parsePesoToCentavos } from "../lib/money";
import { FREE_CAPS, upgradePromptFor } from "../lib/caps";
import { todayDate } from "../lib/datetime";
import { useAuth } from "../auth/AuthProvider";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whole-peso label (no centavos) for the big budget figures. */
function formatPesoWhole(amountMinor: number): string {
  return `₱${Math.round(amountMinor / 100).toLocaleString("en-PH")}`;
}

export function FinanceScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
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
    <ScreenContainer>
      <ScreenHeader title="Money" sub={`${summary.month} budget`} />

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading finances">
        {/* Budget ring */}
        <View className="mt-3.5">
          <Card>
            <View className="flex-row items-center gap-[18px]">
              <Ring pct={pct} value={pctLabel} label="of budget" />
              <View className="flex-1">
                <Text className="font-body-bold text-[12.5px] text-ink-500">Spent this month</Text>
                <Text className="mt-0.5 font-display text-[30px] text-ink">
                  {formatPesoWhole(summary.totalSpentMinor)}
                </Text>
                {summary.totalLimitMinor > 0 ? (
                  <Text className="mt-0.5 font-body text-[13px] text-ink-500">
                    of {formatPesoWhole(summary.totalLimitMinor)} ·{" "}
                    <Text className="font-body-bold text-green">
                      {formatPesoWhole(Math.max(remainingMinor, 0))} left
                    </Text>
                  </Text>
                ) : (
                  <Text className="mt-0.5 font-body text-[13px] text-ink-500">
                    Add a budget category to track this.
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Trending-over note — only when real spend is pacing over budget */}
        {overBudget ? (
          <View className="mt-3.5 flex-row items-start gap-3 rounded-inner bg-amber-bg px-4 py-3">
            <View className="mt-0.5">
              <Icon name="trend" size={20} color={OC.amber} />
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-[13.5px] text-amber-ink">
                Trending a little over
              </Text>
              <Text className="mt-0.5 font-body text-[12.5px] leading-[18px] text-amber-ink">
                {isPro
                  ? "Easing off where you can keeps you in range."
                  : "Otto can forecast where this lands — that's a Pro power."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Bills */}
        <View className="mt-5">
          <SectionLabel
            right={
              <Text className="font-body-semibold text-[11.5px] text-ink-400">
                {bills.length} of {FREE_CAPS.bills} free
              </Text>
            }
          >
            Bills
          </SectionLabel>
          <Card pad="px-4 py-1">
            {bills.length === 0 ? (
              <Text className="py-4 font-body text-[13px] text-ink-500">No bills yet.</Text>
            ) : (
              bills.map((bill, index) => (
                <View
                  key={bill.id}
                  className={`flex-row items-center gap-3 py-3 ${index < bills.length - 1 ? "border-b border-line" : ""}`}
                >
                  <View
                    className="h-[38px] w-[38px] items-center justify-center rounded-inner"
                    style={{ backgroundColor: `${bill.isPaid ? OC.green : OC.sky}1a` }}
                  >
                    <Icon name="peso" size={18} color={bill.isPaid ? OC.green : OC.sky} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-body-bold text-[14.5px] text-ink">{bill.name}</Text>
                    <Text className="mt-px font-body text-[12px] text-ink-500">
                      Due {bill.dueDate}
                    </Text>
                  </View>
                  {bill.isPaid ? <Pill tone="green">Paid</Pill> : null}
                  <Text className="font-display text-[16px] text-ink">
                    {formatPeso(bill.amount.amountMinor)}
                  </Text>
                </View>
              ))
            )}
          </Card>
          {billsAtCap ? (
            <View className="mt-2">
              <Banner message={upgradePromptFor("bills")} tone="warning" />
              <Button label="Upgrade to Pro" onPress={goToUpgrade} />
            </View>
          ) : null}
        </View>

        {/* Recent transactions */}
        <View className="mt-5">
          <SectionLabel>Recent</SectionLabel>
          <Card pad="px-4 py-1">
            {transactions.length === 0 ? (
              <Text className="py-4 font-body text-[13px] text-ink-500">No transactions yet.</Text>
            ) : (
              transactions.slice(0, 6).map((tx, index, arr) => (
                <View
                  key={tx.id}
                  className={`flex-row items-center gap-3 py-3 ${index < arr.length - 1 ? "border-b border-line" : ""}`}
                >
                  <View className="flex-1">
                    <Text className="font-body-bold text-[14px] text-ink">
                      {tx.description ?? "Transaction"}
                    </Text>
                  </View>
                  <Text className="font-display text-[15px] text-ink">
                    -{formatPeso(tx.amount.amountMinor)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Add forms (collapsible — keeps every entry path intact) */}
        {showForms ? (
          <View className="mt-4 gap-4">
            {formError ? <Banner message={formError} tone="warning" /> : null}

            <Card title="Add a transaction">
              <LabeledInput
                label="Amount (₱)"
                value={txAmount}
                onChangeText={setTxAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <LabeledInput
                label="Description (optional)"
                value={txDesc}
                onChangeText={setTxDesc}
                placeholder="e.g. Groceries"
              />
              <Button label="Add transaction" onPress={() => void handleAddTx()} />
            </Card>

            <Card title={`Bills (${bills.length}/${FREE_CAPS.bills})`}>
              {billsAtCap ? (
                <Banner message={upgradePromptFor("bills")} tone="warning" />
              ) : (
                <View>
                  <LabeledInput
                    label="Bill name"
                    value={billName}
                    onChangeText={setBillName}
                    placeholder="e.g. Electric"
                  />
                  <LabeledInput
                    label="Amount (₱)"
                    value={billAmount}
                    onChangeText={setBillAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  <LabeledInput
                    label="Due date (YYYY-MM-DD)"
                    value={billDue}
                    onChangeText={setBillDue}
                  />
                  <Button label="Add bill" onPress={() => void handleAddBill()} />
                </View>
              )}
            </Card>

            <Card title={`Budget categories (${categories.length}/${FREE_CAPS.budgetCategories})`}>
              {categoriesAtCap ? (
                <Banner message={upgradePromptFor("budgetCategories")} tone="warning" />
              ) : (
                <View>
                  <LabeledInput
                    label="Category name"
                    value={catName}
                    onChangeText={setCatName}
                    placeholder="e.g. Food"
                  />
                  <LabeledInput
                    label="Monthly limit (₱, optional)"
                    value={catLimit}
                    onChangeText={setCatLimit}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  <Button label="Add category" onPress={() => void handleAddCategory()} />
                </View>
              )}
            </Card>

            <Card title={`Income (${income.length})`}>
              <LabeledInput
                label="Source"
                value={incomeSource}
                onChangeText={setIncomeSource}
                placeholder="e.g. Salary"
              />
              <LabeledInput
                label="Amount (₱)"
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Button label="Add income" onPress={() => void handleAddIncome()} />
            </Card>

            <Button label="Done" variant="ghost" onPress={() => setShowForms(false)} />
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForms(true)}
            accessibilityRole="button"
            accessibilityLabel="Add money entries"
            className="mt-4 flex-row items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-line-strong bg-surface py-3.5"
          >
            <Icon name="plus" size={18} color={OC.green} />
            <Text className="font-body-extra text-[14.5px] text-green">Add a bill or expense</Text>
          </Pressable>
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
