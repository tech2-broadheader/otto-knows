// Finance (story 3.2). Add income / bills / transactions / budget categories and
// show the monthly budget summary (computeBudgetSummary). Free caps enforced with
// a clear upgrade prompt at the cap. Logic lives in useFinance; money is parsed
// to centavos at this UI edge and formatted back for display.
import { useState } from "react";
import { Text, View } from "react-native";
import type { IncomeCadence } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useFinance } from "../hooks/useFinance";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card, LabeledInput } from "../components/ui";
import { formatPeso, parsePesoToCentavos } from "../lib/money";
import { FREE_CAPS, upgradePromptFor } from "../lib/caps";
import { todayDate } from "../lib/datetime";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function FinanceScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const finance = useFinance(deps);
  const {
    state,
    error,
    bills,
    income,
    summary,
    categories,
    billsAtCap,
    categoriesAtCap,
    addBill,
    addIncome,
    addTransaction,
    addCategory,
    reload,
  } = finance;

  // Local form state.
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

  return (
    <ScreenScroll>
      <Text className="mb-4 text-2xl font-bold text-slate-900">Finance</Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading finances">
        {formError ? <Banner message={formError} tone="warning" /> : null}

        <Card title={`This month — ${summary.month}`}>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Spent</Text>
            <Text className="text-sm font-medium text-slate-900">
              {formatPeso(summary.totalSpentMinor)}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-sm text-slate-500">Budgeted</Text>
            <Text className="text-sm font-medium text-slate-900">
              {formatPeso(summary.totalLimitMinor)}
            </Text>
          </View>
          {summary.categories.length === 0 ? (
            <EmptyState title="No categories yet" hint="Add one below to track spending." />
          ) : (
            <View className="mt-3">
              {summary.categories.map((cat) => (
                <View
                  key={cat.categoryId}
                  className="flex-row justify-between border-t border-slate-100 py-2"
                  accessibilityLabel={`${cat.name}: spent ${formatPeso(cat.spentMinor)}`}
                >
                  <Text className="text-sm text-slate-700">{cat.name}</Text>
                  <Text
                    className={`text-sm font-medium ${cat.isOverBudget ? "text-red-600" : "text-slate-900"}`}
                  >
                    {formatPeso(cat.spentMinor)}
                    {cat.limitMinor !== null ? ` / ${formatPeso(cat.limitMinor)}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

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
          {bills.map((bill) => (
            <View key={bill.id} className="flex-row justify-between border-b border-slate-100 py-2">
              <Text className="text-sm text-slate-700">
                {bill.name} · due {bill.dueDate}
              </Text>
              <Text className="text-sm font-medium text-slate-900">
                {formatPeso(bill.amount.amountMinor)}
              </Text>
            </View>
          ))}
          {billsAtCap ? (
            <Banner message={upgradePromptFor("bills")} tone="warning" />
          ) : (
            <View className="mt-2">
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
          {income.map((entry) => (
            <View
              key={entry.id}
              className="flex-row justify-between border-b border-slate-100 py-2"
            >
              <Text className="text-sm text-slate-700">{entry.source}</Text>
              <Text className="text-sm font-medium text-slate-900">
                {formatPeso(entry.amount.amountMinor)}
              </Text>
            </View>
          ))}
          <View className="mt-2">
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
          </View>
        </Card>
      </AsyncBoundary>
    </ScreenScroll>
  );
}
