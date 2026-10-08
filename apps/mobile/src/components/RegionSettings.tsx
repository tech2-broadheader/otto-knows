// Settings → Region & currency (stories 13.1 / 13.4). Region sets how numbers
// and dates are written; the home currency can change only until money has
// been recorded (no conversion, ADR-007); the timezone follows the phone.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@otto/schemas";
import { settingsRepository } from "../data";
import { Card, ChoicePills, Field, SaveBar } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { t } from "../i18n";
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

  const pickRegion = (regionLocale: string): void => {
    const next = REGIONS.find((r) => r.locale === regionLocale);
    if (!next) return;
    setLocale(next.locale);
    if (!locked) setCurrency(next.currency);
  };

  const save = async (): Promise<void> => {
    const result = await updateSettings({ ...settings, locale, currency });
    if (result === "currency-locked") {
      setMessage(t("onboarding.regionSettings.lockedError", { currency: settings.currency }));
      return;
    }
    setMessage(undefined);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card pad={16} style={{ paddingVertical: 4 }}>
        <Row
          label={t("onboarding.regionSettings.region")}
          value={region?.label ?? settings.locale}
        />
        <Row
          label={t("onboarding.regionSettings.currency")}
          value={`${settings.currency} · ${currencySymbol(settings.currency, settings.locale)}`}
        />
        <Row
          label={t("onboarding.regionSettings.timeZone")}
          value={t("onboarding.regionSettings.timeZoneValue", { timezone: settings.timezone })}
          last
        />
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
            {t("onboarding.regionSettings.change")}
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card>
      <Field
        label={t("onboarding.regionSettings.region")}
        hint={t("onboarding.regionSettings.regionHint")}
      >
        <ChoicePills
          options={REGIONS.map((r) => ({ k: r.locale, l: r.label }))}
          value={regionForLocale(locale)?.locale ?? ""}
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
          {t("onboarding.regionSettings.locked", { currency: settings.currency })}
        </Text>
      ) : (
        <Field label={t("onboarding.regionSettings.currency")}>
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
