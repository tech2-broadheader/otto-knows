// Onboarding → "Where are you based?" (story 13.4). The region sets how money
// and dates are written and suggests the home currency, which the user can
// confirm or change here. Controlled: OnboardingScreen owns the choice and saves
// it when the user continues (Skip keeps the phone's suggestion).
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@otto/schemas";
import { ChoicePills, Display } from "../design/kit";
import { Icon } from "../design/Icon";
import { FONT, OC, RADIUS, eyebrow } from "../design/theme";
import { t } from "../i18n";
import { currencySymbol } from "../lib/money";
import { REGION_GROUPS, type Region } from "../lib/regions";

export function RegionStep({
  region,
  currency,
  onRegion,
  onCurrency,
}: {
  region: Region;
  currency: CurrencyCode;
  onRegion: (region: Region) => void;
  onCurrency: (currency: CurrencyCode) => void;
}): React.JSX.Element {
  const [pickCurrency, setPickCurrency] = useState(false);

  return (
    <View style={{ paddingTop: 6 }}>
      <Display style={{ fontSize: 26 }}>{t("onboarding.region.title")}</Display>
      <Text
        style={{
          marginTop: 8,
          marginBottom: 18,
          fontFamily: FONT.body,
          fontSize: 14,
          lineHeight: 21,
          color: OC.ink500,
        }}
      >
        {t("onboarding.region.intro")}
      </Text>

      {/* Currency confirmation — follows the region unless the user picks another */}
      <View
        style={{
          backgroundColor: OC.mist,
          borderRadius: RADIUS.inner,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: OC.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 18, color: OC.green }}>
              {currencySymbol(currency, region.locale)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.forest }}>
              {t("onboarding.region.currency", { currency })}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              {t("onboarding.region.currencyNote")}
            </Text>
          </View>
        </View>
        {pickCurrency ? (
          <View style={{ marginTop: 14 }}>
            <ChoicePills
              options={SUPPORTED_CURRENCIES.map((c) => ({ k: c, l: c }))}
              value={currency}
              onChange={(c) => {
                onCurrency(c as CurrencyCode);
                setPickCurrency(false);
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setPickCurrency(true)}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => ({ marginTop: 10, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontFamily: FONT.bodyX, fontSize: 13.5, color: OC.green }}>
              {t("onboarding.region.differentCurrency")}
            </Text>
          </Pressable>
        )}
      </View>

      {REGION_GROUPS.map((group) => (
        <View key={group.title} style={{ marginBottom: 14 }}>
          <Text style={[eyebrow, { marginBottom: 4 }]}>{group.title}</Text>
          {group.regions.map((r, index) => {
            const selected = r.locale === region.locale;
            return (
              <Pressable
                key={r.locale}
                onPress={() => onRegion(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: index < group.regions.length - 1 ? 1 : 0,
                  borderBottomColor: OC.line,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: selected ? FONT.bodyBold : FONT.body,
                    fontSize: 15,
                    color: selected ? OC.forest : OC.ink,
                  }}
                >
                  {r.label}
                </Text>
                <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: OC.ink400 }}>
                  {r.currency}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: selected ? 0 : 1.5,
                    borderColor: OC.lineStrong,
                    backgroundColor: selected ? OC.green : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected ? <Icon name="check" size={13} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
