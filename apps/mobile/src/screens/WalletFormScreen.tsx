// Add / edit a wallet (story 11.2) — approved design "Add wallet": type (cash,
// e-wallet, bank, credit card), name, optional provider, opening balance — or,
// for a card, the amount owed. Editing adds Archive (only at a zero balance,
// ADR-004). Free users see the 3-wallet limit here, where it applies.
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { AccountType } from "@otto/schemas";
import { canArchiveAccount } from "@otto/core";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useFinance } from "../hooks/useFinance";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useAuth } from "../auth/AuthProvider";
import { FormError, WALLET_STYLE } from "../components/money-ui";
import { Field, OverlayScreen, ProGate, SaveBar, TextField } from "../design/kit";
import { Icon } from "../design/Icon";
import { FONT, OC, RADIUS } from "../design/theme";
import { upgradePromptFor } from "../lib/caps";
import { validateWalletForm } from "../lib/forms";
import { formatMoneyInput } from "../lib/money";
import { useMoney } from "../lib/settings-context";
import { t } from "../i18n";

type Params = { accountId?: string };

const TYPES: { type: AccountType; sub: string }[] = [
  { type: "cash", sub: t("money.walletForm.types.cash") },
  { type: "ewallet", sub: t("money.walletForm.types.ewallet") },
  { type: "bank", sub: t("money.walletForm.types.bank") },
  { type: "credit_card", sub: t("money.walletForm.types.credit_card") },
];

export function WalletFormScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const params = (useRoute().params ?? {}) as Params;
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const goToUpgrade = useUpgradeNavigation();
  const money = useMoney();
  const finance = useFinance(deps, { isPro });
  const editing = params.accountId
    ? finance.accounts.find((a) => a.id === params.accountId)
    : undefined;
  const editingBalance = editing
    ? (finance.wallets.perAccount.find((b) => b.accountId === editing.id)?.balanceMinor ?? 0)
    : 0;

  const [type, setType] = useState<AccountType>("ewallet");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || finance.state !== "ready") return;
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setProvider(editing.provider ?? "");
      const opening = editing.openingBalance.amountMinor;
      setBalanceText(
        formatMoneyInput(
          editing.type === "credit_card" ? -opening : opening,
          money.currency,
          money.locale,
        ),
      );
    }
    setPrefilled(true);
  }, [editing, finance.state, money, prefilled]);

  const atCap = !editing && finance.walletsAtCap;
  const isCard = type === "credit_card";

  const save = async (): Promise<void> => {
    const result = validateWalletForm({ type, name, provider, balanceText }, money);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setSaving(true);
    try {
      if (editing) {
        await finance.updateAccount(editing.id, result.value);
      } else {
        const created = await finance.addAccount(result.value);
        if (created === "at-cap") return setError(upgradePromptFor("wallets"));
      }
      navigation.goBack();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("money.walletForm.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const archive = (): void => {
    if (!editing) return;
    if (!canArchiveAccount(editingBalance)) {
      Alert.alert(t("money.walletForm.emptyFirstTitle"), t("money.walletForm.emptyFirstBody"));
      return;
    }
    void finance.archiveAccount(editing.id).then((ok) => ok && navigation.goBack());
  };

  return (
    <OverlayScreen
      title={editing ? t("money.walletForm.titleEdit") : t("money.walletForm.titleAdd")}
      onBack={() => navigation.goBack()}
      footer={
        atCap ? undefined : (
          <SaveBar
            label={saving ? t("money.saving") : t("money.walletForm.save")}
            disabled={saving}
            onCancel={() => navigation.goBack()}
            onSave={() => void save()}
          />
        )
      }
    >
      {atCap ? (
        <ProGate onUpgrade={goToUpgrade}>
          <Text style={{ fontFamily: FONT.display, fontSize: 17, color: "#fff" }}>
            {t("money.walletForm.atLimit")}
          </Text>
          <Text
            style={{
              fontFamily: FONT.body,
              fontSize: 13.5,
              color: OC.sage,
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            {upgradePromptFor("wallets")}
          </Text>
        </ProGate>
      ) : (
        <>
          <FormError message={error} />
          <Field label={t("money.walletForm.type")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TYPES.map(({ type: option, sub }) => {
                const on = option === type;
                const style = WALLET_STYLE[option];
                return (
                  <Pressable
                    key={option}
                    onPress={() => setType(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      width: "48%",
                      flexGrow: 1,
                      backgroundColor: on ? OC.forest : OC.surface,
                      borderWidth: 1.5,
                      borderColor: on ? OC.forest : OC.line,
                      borderRadius: RADIUS.inner,
                      paddingVertical: 11,
                      paddingHorizontal: 13,
                      gap: 4,
                    }}
                  >
                    <Icon name={style.icon} size={17} color={on ? OC.mint : style.color} />
                    <Text
                      style={{
                        fontFamily: FONT.bodyX,
                        fontSize: 14,
                        color: on ? OC.mint : OC.ink700,
                      }}
                    >
                      {style.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT.bodySemi,
                        fontSize: 11.5,
                        color: on ? OC.mint : OC.ink500,
                      }}
                    >
                      {sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label={t("money.walletForm.name")}>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder={
                isCard
                  ? t("money.walletForm.namePlaceholderCard")
                  : t("money.walletForm.namePlaceholder")
              }
            />
          </Field>
          <Field label={t("money.walletForm.provider")} hint={t("money.optionalHint")}>
            <TextField
              value={provider}
              onChangeText={setProvider}
              placeholder={t("money.walletForm.providerPlaceholder")}
            />
          </Field>
          <Field
            label={isCard ? t("money.walletForm.owedNow") : t("money.walletForm.balanceNow")}
            hint={isCard ? t("money.walletForm.owedNowHint") : t("money.walletForm.balanceNowHint")}
          >
            <TextField
              value={balanceText}
              onChangeText={setBalanceText}
              placeholder="0"
              prefix={money.symbol}
              big
              keyboardType="decimal-pad"
            />
          </Field>
          {editing ? (
            <Pressable
              onPress={archive}
              accessibilityRole="button"
              style={({ pressed }) => [
                { alignSelf: "center", padding: 12, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.coralInk }}>
                {t("money.walletForm.archive")}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </OverlayScreen>
  );
}
