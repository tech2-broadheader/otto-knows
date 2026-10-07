// Settings → Your data (stories 1.4 AC4 / 13.6 AC2; approved design 2026-10-08).
// Download a copy of everything Otto keeps (JSON via the system share sheet),
// erase this phone's data (account stays), or delete the account. Both erasures
// confirm first and then restart Otto at onboarding.
import { useState } from "react";
import { Alert, Modal, Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthProvider";
import { exportMyData } from "../data";
import { Card, Display, OverlayScreen, PrimaryButton } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { FONT, OC, RADIUS, eyebrow, tint } from "../design/theme";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { wipeLocalData } from "../lib/account";
import { deleteAccount } from "../lib/api-client";
import { useAppReset } from "../lib/app-reset";
import { LOCAL_USER_ID } from "../lib/constants";
import { buildExportFile } from "../lib/data-export";
import appConfig from "../../app.json";

const INCLUDED = [
  "Wallets & transactions",
  "Bills & income",
  "Budgets",
  "Reminders & notes",
  "Appointments & alarms",
  "Medications",
  "Routine",
  "Consents & access log",
] as const;

type Pending = "erase" | "delete-account" | null;

const CONFIRM: Record<Exclude<Pending, null>, { title: string; body: string; action: string }> = {
  erase: {
    title: "Erase everything on this phone?",
    body: "Wallets, transactions, reminders, notes and health entries are removed for good. Download a copy first if you might need it.",
    action: "Erase",
  },
  "delete-account": {
    title: "Delete your account?",
    body: "Your Otto account, any Pro backup and everything on this phone are removed for good. This can't be undone.",
    action: "Delete",
  },
};

export function YourDataScreen({
  navigation,
}: {
  navigation: { goBack: () => void };
}): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { status, signOut } = useAuth();
  const signedIn = status === "signed-in";
  const reset = useAppReset();
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [working, setWorking] = useState(false);

  const download = async (): Promise<void> => {
    setExporting(true);
    try {
      const bundle = await exportMyData(LOCAL_USER_ID, deps);
      const exportedAt = new Date().toISOString();
      await Share.share({
        title: `Otto data ${exportedAt.slice(0, 10)}`,
        message: buildExportFile(bundle, { appVersion: appConfig.expo.version, exportedAt }),
      });
    } catch {
      Alert.alert("Couldn't prepare your data", "Nothing was shared. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const confirm = async (): Promise<void> => {
    if (!pending) return;
    setWorking(true);
    try {
      // Delete the cloud account first; if that fails, keep this phone's data so
      // the user can retry rather than lose it silently.
      if (pending === "delete-account" && signedIn) {
        const res = await deleteAccount();
        if (!res.ok) {
          Alert.alert(
            "Couldn't delete your account",
            `${res.message} Your data is unchanged — please try again.`,
          );
          return;
        }
      }
      await wipeLocalData();
      if (pending === "delete-account") await signOut();
      setPending(null);
      reset(); // restarts Otto at onboarding with a fresh Cash wallet
    } finally {
      setWorking(false);
    }
  };

  return (
    <OverlayScreen title="Your data" onBack={() => navigation.goBack()}>
      <Text
        style={{
          fontFamily: FONT.body,
          fontSize: 14,
          lineHeight: 21,
          color: OC.ink500,
          marginBottom: 16,
        }}
      >
        It&apos;s yours. Take a copy any time, or erase it from this phone.
      </Text>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconTile icon="download" color={OC.green} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyX, fontSize: 15, color: OC.ink }}>
              Download a copy
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              Everything as JSON, to save or send
            </Text>
          </View>
        </View>
        <Text style={[eyebrow, { marginTop: 14, marginBottom: 8 }]}>What&apos;s in it</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {INCLUDED.map((item) => (
            <View
              key={item}
              style={{
                backgroundColor: OC.paper2,
                borderRadius: RADIUS.pill,
                paddingHorizontal: 11,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12, color: OC.ink700 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 14,
            backgroundColor: OC.amberBg,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ marginTop: 1 }}>
            <Icon name="lock" size={16} color={OC.amberInk} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: FONT.bodySemi,
              fontSize: 12.5,
              lineHeight: 18,
              color: OC.amberInk,
            }}
          >
            The copy isn&apos;t encrypted — it holds your money and health details. Keep it
            somewhere private.
          </Text>
        </View>
        <PrimaryButton
          label={exporting ? "Preparing…" : "Download my data"}
          onPress={() => void download()}
          disabled={exporting}
          style={{ marginTop: 14 }}
        />
      </Card>

      <Card pad={16} style={{ marginTop: 16, paddingVertical: 2 }}>
        <DangerRow
          icon="trash"
          title="Erase data on this phone"
          subtitle="Start fresh. Your account stays."
          onPress={() => setPending("erase")}
        />
        <DangerRow
          icon="user"
          title="Delete my account"
          subtitle="Account, Pro backup and this phone's data"
          titleColor={OC.coralInk}
          onPress={() => setPending("delete-account")}
          last
        />
      </Card>

      <ConfirmSheet
        pending={pending}
        working={working}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
      />
    </OverlayScreen>
  );
}

function IconTile({ icon, color }: { icon: IconName; color: string }): React.JSX.Element {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: tint(color),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={19} color={color} />
    </View>
  );
}

function DangerRow({
  icon,
  title,
  subtitle,
  titleColor = OC.ink,
  onPress,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  titleColor?: string;
  onPress: () => void;
  last?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: OC.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <IconTile icon={icon} color={OC.coral} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: titleColor }}>
          {title}
        </Text>
        <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevR" size={18} color={OC.ink400} />
    </Pressable>
  );
}

function ConfirmSheet({
  pending,
  working,
  onCancel,
  onConfirm,
}: {
  pending: Pending;
  working: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const copy = pending ? CONFIRM[pending] : null;
  return (
    <Modal visible={pending !== null} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        onPress={working ? undefined : onCancel}
        accessibilityLabel="Close"
        style={{ flex: 1, backgroundColor: "rgba(8,36,26,0.42)" }}
      />
      {copy ? (
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: OC.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <Display style={{ fontSize: 20 }}>{copy.title}</Display>
          <Text
            style={{
              marginTop: 6,
              marginBottom: 14,
              fontFamily: FONT.body,
              fontSize: 13.5,
              lineHeight: 20,
              color: OC.ink500,
            }}
          >
            {copy.body}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onCancel}
              disabled={working}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 13,
                borderWidth: 1.5,
                borderColor: OC.lineStrong,
                borderRadius: RADIUS.btn,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink700 }}>
                Keep my data
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={working}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1.3,
                alignItems: "center",
                paddingVertical: 13,
                backgroundColor: OC.coralInk,
                borderRadius: RADIUS.btn,
                opacity: pressed || working ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: FONT.bodyX, fontSize: 14.5, color: "#fff" }}>
                {working ? "Working…" : copy.action}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
