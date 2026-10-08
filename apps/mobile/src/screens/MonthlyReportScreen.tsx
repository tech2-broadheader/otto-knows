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
import { t } from "../i18n";

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
  const comparison = spendingComparison(change, changePct, money.format);

  return (
    <OverlayScreen title={t("money.report.title")} onBack={() => navigation.goBack()}>
      <AsyncBoundary
        state={finance.state}
        error={finance.error}
        onRetry={finance.reload}
        loadingLabel={t("money.report.loading")}
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
            label={t("money.report.previousMonth")}
          />
          <View style={{ alignItems: "center" }}>
            <Display style={{ fontSize: 17 }}>{monthLabel(month)}</Display>
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
              {t("money.report.vsMonth", { month: monthLabel(previousMonth(month)) })}
            </Text>
          </View>
          <MonthButton
            direction="forward"
            onPress={() => setMonth(nextMonth(month))}
            label={t("money.report.nextMonth")}
            disabled={month >= thisMonth}
          />
        </View>

        {empty ? (
          <EmptyState
            icon="trend"
            title={t("money.report.emptyTitle")}
            body={t("money.report.emptyBody")}
          />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Tile
                label={t("money.report.income")}
                value={money.format(report.incomeMinor)}
                color={OC.green}
              />
              <Tile label={t("money.report.spending")} value={money.format(report.spendingMinor)} />
              <View style={{ flex: 1, backgroundColor: OC.dark, borderRadius: 16, padding: 12 }}>
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 11.5, color: OC.sage }}>
                  {t("money.report.net")}
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
              {comparison} {t("money.report.transfersNotCounted")}
            </Text>

            <Card style={{ marginTop: 16, gap: 14 }}>
              <Text style={eyebrow}>{t("money.report.byCategory")}</Text>
              {report.categories.map((line, index) => (
                <View
                  key={line.categoryId ?? "uncategorized"}
                  accessible
                  accessibilityLabel={t("money.report.categoryA11y", {
                    name: line.name,
                    amount: money.format(line.spentMinor),
                    change: changeText(
                      line.changeMinor,
                      line.changePct,
                      line.previousMinor,
                      money.format,
                    ),
                  })}
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
                {t("money.report.onDevice")}
              </Text>
            </View>
          </>
        )}
      </AsyncBoundary>
    </OverlayScreen>
  );
}

/** The sentence comparing this month's spending with last month's. */
function spendingComparison(
  change: number | null,
  changePct: number | null,
  format: (minor: number) => string,
): string {
  if (change === null) return t("money.report.noEarlierMonth");
  if (change === 0) return t("money.report.sameSpending");
  const amount = format(Math.abs(change));
  if (changePct === null) {
    return t(change > 0 ? "money.report.spendingMore" : "money.report.spendingLess", { amount });
  }
  return t(change > 0 ? "money.report.spendingMorePct" : "money.report.spendingLessPct", {
    amount,
    pct: Math.abs(changePct),
  });
}

function changeText(
  changeMinor: number,
  changePct: number | null,
  previousMinor: number,
  format: (minor: number) => string,
): string {
  if (previousMinor === 0) return t("money.report.newThisMonth");
  if (changeMinor === 0) return t("money.report.sameAsLast");
  const sign = changeMinor > 0 ? "+" : "−";
  const amount = format(Math.abs(changeMinor));
  if (changePct === null) return t("money.report.changeVsLast", { sign, amount });
  return t("money.report.changeVsLastPct", { sign, amount, pct: Math.abs(changePct) });
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
