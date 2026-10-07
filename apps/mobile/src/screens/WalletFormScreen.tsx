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

type Params = { accountId?: string };

const TYPES: { type: AccountType; sub: string }[] = [
  { type: "cash", sub: "Bills and coins" },
  { type: "ewallet", sub: "Mobile wallets" },
  { type: "bank", sub: "Savings, payroll" },
  { type: "credit_card", sub: "Tracks what you owe" },
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
      setError(caught instanceof Error ? caught.message : "Couldn't save the wallet.");
    } finally {
      setSaving(false);
    }
  };

  const archive = (): void => {
    if (!editing) return;
    if (!canArchiveAccount(editingBalance)) {
      Alert.alert(
        "Empty it first",
        "Archive a wallet once its balance is zero — move what's left with a transfer.",
      );
      return;
    }
    void finance.archiveAccount(editing.id).then((ok) => ok && navigation.goBack());
  };

  return (
    <OverlayScreen
      title={editing ? "Edit wallet" : "Add a wallet"}
      onBack={() => navigation.goBack()}
      footer={
        atCap ? undefined : (
          <SaveBar
            label={saving ? "Saving…" : "Save wallet"}
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
            You're at the wallet limit
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
          <Field label="Type">
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
          <Field label="Name">
            <TextField
              value={name}
              onChangeText={setName}
              placeholder={isCard ? "e.g. Visa card" : "e.g. Savings"}
            />
          </Field>
          <Field label="Provider" hint="optional">
            <TextField value={provider} onChangeText={setProvider} placeholder="Your bank or app" />
          </Field>
          <Field
            label={isCard ? "Amount owed now" : "Balance now"}
            hint={isCard ? "From your latest statement" : "What's in it today"}
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
                Archive wallet
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </OverlayScreen>
  );
}
