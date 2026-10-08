// Wallets (story 11.2) — approved design "Wallets": money on hand and card debt
// totals, active wallets with derived balances (a card shows what's owed),
// add-a-wallet, and archived wallets that can be restored.
import { useCallback, useMemo } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../auth/AuthProvider";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { IconTile, WALLET_STYLE } from "../components/money-ui";
import { AddButton, Card, Display, OverlayScreen, SectionLabel } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { upgradePromptFor } from "../lib/caps";
import { useMoney } from "../lib/settings-context";
import { t } from "../i18n";

type Nav = {
  navigate: (screen: string, params?: Record<string, string>) => void;
  goBack: () => void;
};

export function WalletsScreen(): React.JSX.Element {
  const navigation = useNavigation() as unknown as Nav;
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const money = useMoney();
  const finance = useFinance(deps, { isPro });
  const { reload } = finance;

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const balance = useMemo(
    () => new Map(finance.wallets.perAccount.map((b) => [b.accountId, b.balanceMinor])),
    [finance.wallets.perAccount],
  );
  const archived = finance.accounts.filter((a) => a.archivedAt !== undefined);

  const restore = async (id: string): Promise<void> => {
    const result = await finance.restoreAccount(id);
    if (result === "at-cap")
      Alert.alert(t("money.wallets.limitReached"), upgradePromptFor("wallets"));
  };

  return (
    <OverlayScreen title={t("money.wallets.title")} onBack={() => navigation.goBack()}>
      <AsyncBoundary
        state={finance.state}
        error={finance.error}
        onRetry={reload}
        loadingLabel={t("money.wallets.loading")}
      >
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <Card pad={14} style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12, color: OC.ink500 }}>
              {t("money.wallets.onHand")}
            </Text>
            <Display style={{ fontSize: 21, marginTop: 2 }}>
              {money.format(finance.wallets.onHandMinor)}
            </Display>
          </Card>
          <View
            style={{
              flex: 1,
              backgroundColor: OC.coralBg,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#F3CFC8",
            }}
          >
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12, color: OC.coralInk }}>
              {t("money.wallets.owedOnCards")}
            </Text>
            <Display style={{ fontSize: 21, marginTop: 2, color: OC.coralInk }}>
              {money.format(finance.wallets.cardOwedMinor)}
            </Display>
          </View>
        </View>

        <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
          {finance.activeAccounts.map((account, index) => {
            const style = WALLET_STYLE[account.type];
            const amount = balance.get(account.id) ?? 0;
            const isCard = account.type === "credit_card";
            const sub = [style.label, account.provider].filter(Boolean).join(" · ");
            return (
              <Pressable
                key={account.id}
                onPress={() => navigation.navigate("WalletForm", { accountId: account.id })}
                accessibilityRole="button"
                accessibilityLabel={
                  isCard
                    ? t("money.wallets.rowA11yCard", {
                        name: account.name,
                        amount: money.format(Math.max(-amount, 0)),
                      })
                    : t("money.wallets.rowA11y", {
                        name: account.name,
                        amount: money.format(amount),
                      })
                }
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 13,
                    borderBottomWidth: index < finance.activeAccounts.length - 1 ? 1 : 0,
                    borderBottomColor: OC.line,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconTile icon={style.icon} color={style.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                    {account.name}
                  </Text>
                  <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                    {sub}
                  </Text>
                </View>
                {isCard ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: FONT.bodyBold, fontSize: 11, color: OC.coralInk }}>
                      {t("money.wallets.owed")}
                    </Text>
                    <Text style={{ fontFamily: FONT.bodyX, fontSize: 15, color: OC.coralInk }}>
                      {money.format(Math.max(-amount, 0))}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontFamily: FONT.bodyX,
                      fontSize: 15,
                      color: OC.ink,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {money.format(amount)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </Card>

        <AddButton
          label={t("money.wallets.add")}
          onPress={() => navigation.navigate("WalletForm")}
        />

        {archived.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <SectionLabel>{t("money.wallets.archived")}</SectionLabel>
            {archived.map((account) => (
              <View
                key={account.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: OC.paper2,
                  borderRadius: 16,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink500 }}>
                    {account.name}
                  </Text>
                  <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink400 }}>
                    {t("money.wallets.historyKept")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void restore(account.id)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={{ fontFamily: FONT.bodyX, fontSize: 13, color: OC.green }}>
                    {t("money.wallets.restore")}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </AsyncBoundary>
    </OverlayScreen>
  );
}
