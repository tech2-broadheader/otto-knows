// Monthly report (story 11.5) — approved design "Monthly report": month
// switcher (no future months), income / spending / net, the change vs last
// month, and spending by category with each category's change. Computed on the
// phone from useFinance (computeMonthlyReport); transfers never count.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { nextMonth, previousMonth } from "@otto/core";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../auth/AuthProvider";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Card, Display, EmptyState, OverlayScreen } from "../design/kit";
import { Icon } from "../design/Icon";
import { FONT, OC, eyebrow } from "../design/theme";
import { currentMonth } from "../lib/datetime";
import { useMoney } from "../lib/settings-context";

type Params = { month?: string };

const BAR_COLORS = [OC.amber, OC.sky, OC.emerald, OC.sage, OC.green, OC.coral];

export function MonthlyReportScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const params = (useRoute().params ?? {}) as Params;
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const money = useMoney();
  const finance = useFinance(deps, { isPro });
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(params.month ?? thisMonth);
  const { monthlyReport } = finance;
  const report = useMemo(() => monthlyReport(month), [monthlyReport, month]);

  const monthLabel = (m: string): string =>
    new Intl.DateTimeFormat(money.locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${m}-01T00:00:00Z`));
  const largest = Math.max(1, ...report.categories.map((c) => c.spentMinor));
  const change = report.previous ? report.spendingMinor - report.previous.spendingMinor : null;
  const changePct =
    report.previous && report.previous.spendingMinor > 0 && change !== null
      ? Math.round((change / report.previous.spendingMinor) * 1000) / 10
      : null;
  const empty = report.incomeMinor === 0 && report.spendingMinor === 0;

  return (
    <OverlayScreen title="Monthly report" onBack={() => navigation.goBack()}>
      <AsyncBoundary
        state={finance.state}
        error={finance.error}
        onRetry={finance.reload}
        loadingLabel="Building your report"
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: OC.surface,
            borderWidth: 1,
            borderColor: OC.line,
            borderRadius: 14,
            padding: 6,
            marginBottom: 16,
          }}
        >
          <MonthButton
            direction="back"
            onPress={() => setMonth(previousMonth(month))}
            label="Previous month"
          />
          <View style={{ alignItems: "center" }}>
            <Display style={{ fontSize: 17 }}>{monthLabel(month)}</Display>
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
              vs {monthLabel(previousMonth(month))}
            </Text>
          </View>
          <MonthButton
            direction="forward"
            onPress={() => setMonth(nextMonth(month))}
            label="Next month"
            disabled={month >= thisMonth}
          />
        </View>

        {empty ? (
          <EmptyState
            icon="trend"
            title="Nothing this month"
            body="Once you log income or spending for this month, your report shows up here."
          />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Tile label="Income" value={money.format(report.incomeMinor)} color={OC.green} />
              <Tile label="Spending" value={money.format(report.spendingMinor)} />
              <View style={{ flex: 1, backgroundColor: OC.dark, borderRadius: 16, padding: 12 }}>
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 11.5, color: OC.sage }}>
                  Net
                </Text>
                <Text
                  style={{ fontFamily: FONT.display, fontSize: 16, color: "#fff", marginTop: 3 }}
                  numberOfLines={1}
                >
                  {report.netMinor >= 0 ? "+" : ""}
                  {money.format(report.netMinor)}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: FONT.body,
                fontSize: 12.5,
                lineHeight: 18,
                color: OC.ink500,
                marginTop: 10,
                marginHorizontal: 2,
              }}
            >
              {change === null
                ? "No earlier month to compare with yet."
                : change === 0
                  ? "Spending is the same as last month."
                  : `Spending is ${money.format(Math.abs(change))} ${change > 0 ? "more" : "less"} than last month${changePct === null ? "" : ` (${change > 0 ? "+" : "−"}${Math.abs(changePct)}%)`}.`}{" "}
              Transfers and card payments aren't counted.
            </Text>

            <Card style={{ marginTop: 16, gap: 14 }}>
              <Text style={eyebrow}>By category</Text>
              {report.categories.map((line, index) => (
                <View
                  key={line.categoryId ?? "uncategorized"}
                  accessible
                  accessibilityLabel={`${line.name}: ${money.format(line.spentMinor)}. ${changeText(line.changeMinor, line.changePct, line.previousMinor, money.format)}`}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink }}>
                      {line.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT.bodyBold,
                        fontSize: 14,
                        color: OC.ink,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {money.format(line.spentMinor)}
                    </Text>
                  </View>
                  <View
                    style={{ height: 8, borderRadius: 99, backgroundColor: OC.mist, marginTop: 6 }}
                  >
                    <View
                      style={{
                        width: `${Math.max(2, (line.spentMinor / largest) * 100)}%`,
                        height: 8,
                        borderRadius: 99,
                        backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: FONT.bodyBold,
                      fontSize: 11.5,
                      marginTop: 4,
                      color:
                        line.previousMinor === 0
                          ? OC.skyInk
                          : line.changeMinor > 0
                            ? OC.amberInk
                            : line.changeMinor < 0
                              ? OC.green
                              : OC.ink500,
                    }}
                  >
                    {changeText(line.changeMinor, line.changePct, line.previousMinor, money.format)}
                  </Text>
                </View>
              ))}
            </Card>

            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 14 }}>
              <Icon name="shield" size={13} color={OC.ink400} />
              <Text style={{ fontFamily: FONT.body, fontSize: 11.5, color: OC.ink400 }}>
                Computed on your phone. Nothing leaves your device.
              </Text>
            </View>
          </>
        )}
      </AsyncBoundary>
    </OverlayScreen>
  );
}

function changeText(
  changeMinor: number,
  changePct: number | null,
  previousMinor: number,
  format: (minor: number) => string,
): string {
  if (previousMinor === 0) return "New this month";
  if (changeMinor === 0) return "Same as last month";
  const sign = changeMinor > 0 ? "+" : "−";
  const pct = changePct === null ? "" : ` (${sign}${Math.abs(changePct)}%)`;
  return `${sign}${format(Math.abs(changeMinor))}${pct} vs last month`;
}

function Tile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: OC.surface,
        borderWidth: 1,
        borderColor: OC.line,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 11.5, color: OC.ink500 }}>{label}</Text>
      <Text
        style={{ fontFamily: FONT.display, fontSize: 16, color: color ?? OC.ink, marginTop: 3 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MonthButton({
  direction,
  onPress,
  label,
  disabled,
}: {
  direction: "back" | "forward";
  onPress: () => void;
  label: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: disabled ? OC.paper : OC.paper2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name={direction === "back" ? "chevL" : "chevR"}
        size={18}
        color={disabled ? OC.ink300 : OC.ink700}
        stroke={2.2}
      />
    </Pressable>
  );
}
