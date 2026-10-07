// Settings → Region & currency (stories 13.1 / 13.4). Region sets how numbers
// and dates are written; the home currency can change only until money has
// been recorded (no conversion, ADR-007); the timezone follows the phone.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@otto/schemas";
import { settingsRepository } from "../data";
import { Card, ChoicePills, Field, SaveBar } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { LOCAL_USER_ID } from "../lib/constants";
import { currencySymbol } from "../lib/money";
import { REGIONS, regionForLocale } from "../lib/regions";
import { useSettings, useUpdateSettings } from "../lib/settings-context";

export function RegionSettings(): React.JSX.Element {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(true);
  const [locale, setLocale] = useState(settings.locale);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void settingsRepository.hasMoneyData(LOCAL_USER_ID).then((has) => {
      if (!cancelled) setLocked(has);
    });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const region = regionForLocale(settings.locale);

  const pickRegion = (label: string): void => {
    const next = REGIONS.find((r) => r.label === label);
    if (!next) return;
    setLocale(next.locale);
    if (!locked) setCurrency(next.currency);
  };

  const save = async (): Promise<void> => {
    const result = await updateSettings({ ...settings, locale, currency });
    if (result === "currency-locked") {
      setMessage(
        `Your money is recorded in ${settings.currency}, so the currency can't change now.`,
      );
      return;
    }
    setMessage(undefined);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card pad={16} style={{ paddingVertical: 4 }}>
        <Row label="Region" value={region?.label ?? settings.locale} />
        <Row
          label="Currency"
          value={`${settings.currency} · ${currencySymbol(settings.currency, settings.locale)}`}
        />
        <Row label="Time zone" value={`${settings.timezone} (from your phone)`} last />
        <Pressable
          onPress={() => {
            setLocale(settings.locale);
            setCurrency(settings.currency);
            setEditing(true);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            { paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={{ fontFamily: FONT.bodyX, fontSize: 14, color: OC.green }}>
            Change region or currency
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card>
      <Field label="Region" hint="How numbers and dates look">
        <ChoicePills
          options={REGIONS.map((r) => ({ k: r.label, l: r.label }))}
          value={regionForLocale(locale)?.label ?? ""}
          onChange={pickRegion}
        />
      </Field>
      {locked ? (
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            lineHeight: 19,
            color: OC.ink500,
            marginBottom: 14,
          }}
        >
          Your money is recorded in {settings.currency}. The currency stays fixed once you&apos;ve
          added money — Otto never converts amounts.
        </Text>
      ) : (
        <Field label="Currency">
          <ChoicePills
            options={SUPPORTED_CURRENCIES.map((c) => ({ k: c, l: c }))}
            value={currency}
            onChange={(c) => setCurrency(c as CurrencyCode)}
          />
        </Field>
      )}
      {message ? (
        <Text
          style={{ fontFamily: FONT.bodySemi, fontSize: 13, color: OC.amberInk, marginBottom: 12 }}
        >
          {message}
        </Text>
      ) : null}
      <SaveBar onCancel={() => setEditing(false)} onSave={() => void save()} />
    </Card>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: OC.line,
      }}
    >
      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>{label}</Text>
      <Text
        style={{
          flexShrink: 1,
          textAlign: "right",
          fontFamily: FONT.body,
          fontSize: 13.5,
          color: OC.ink500,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
