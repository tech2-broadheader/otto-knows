// Reminders tab → Alarms (story 12.3; approved design 2026-10-08). The next
// alarm, the list with on/off switches, "New alarm", and — when the phone
// won't let alarms ring on time — a notice that opens the right setting.
import { Pressable, Text, View } from "react-native";
import { describeRepeat } from "@otto/core";
import type { AlarmsState } from "../hooks/useAlarms";
import { AddButton, Card, EmptyState, OToggle } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { FONT, OC, RADIUS } from "../design/theme";
import { openExactAlarmSettings, openFullScreenSettings } from "../lib/alarms";
import { DEFAULT_ALARM_LABEL } from "../lib/alarm-sync";
import { AsyncBoundary } from "./AsyncBoundary";
import { t, tSlot } from "../i18n";

export function AlarmsSection({
  alarms,
  onOpen,
}: {
  alarms: AlarmsState;
  /** Open the alarm form: an id edits, none creates. */
  onOpen: (alarmId?: string) => void;
}): React.JSX.Element {
  const { permissions, next } = alarms;
  // The "time until" is bold mid-sentence, so split the message around it.
  const [nextBefore, nextAfter] = next
    ? tSlot("tasks.alarms.next", "in", {
        label: next.alarm.label ?? DEFAULT_ALARM_LABEL,
        time: next.alarm.time,
      })
    : [];

  return (
    <AsyncBoundary
      state={alarms.state}
      error={alarms.error}
      onRetry={alarms.reload}
      loadingLabel={t("tasks.alarms.loading")}
    >
      {!permissions.supported ? <Notice icon="bell" text={t("tasks.alarms.unsupported")} /> : null}

      {next ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: OC.paper2,
            borderRadius: RADIUS.inner,
            paddingHorizontal: 14,
            paddingVertical: 11,
            marginBottom: 12,
          }}
        >
          <Icon name="clock" size={17} color={OC.green} />
          <Text style={{ flex: 1, fontFamily: FONT.bodySemi, fontSize: 13, color: OC.forest }}>
            {nextBefore}
            <Text style={{ fontFamily: FONT.bodyX }}>{next.inText}</Text>
            {nextAfter}
          </Text>
        </View>
      ) : null}

      {alarms.alarms.length === 0 ? (
        <EmptyState
          icon="clock"
          title={t("tasks.alarms.empty.title")}
          body={t("tasks.alarms.empty.body")}
          action={t("tasks.alarms.new")}
          onAction={() => onOpen()}
        />
      ) : (
        <Card pad={16} style={{ paddingVertical: 4 }}>
          {alarms.alarms.map((alarm, index) => {
            const label = alarm.label ?? DEFAULT_ALARM_LABEL;
            return (
              <View
                key={alarm.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: index < alarms.alarms.length - 1 ? 1 : 0,
                  borderBottomColor: OC.line,
                }}
              >
                <Pressable
                  onPress={() => onOpen(alarm.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t("tasks.alarms.editLabel", { label, time: alarm.time })}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
                >
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 34,
                      lineHeight: 38,
                      color: alarm.enabled ? OC.ink : OC.ink400,
                    }}
                  >
                    {alarm.time}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontFamily: FONT.body,
                      fontSize: 12.5,
                      color: alarm.enabled ? OC.ink500 : OC.ink400,
                    }}
                  >
                    <Text style={{ fontFamily: FONT.bodyBold }}>{label}</Text> ·{" "}
                    {describeRepeat(alarm.repeatDays)}
                  </Text>
                </Pressable>
                <OToggle
                  on={alarm.enabled}
                  onToggle={() => void alarms.setEnabled(alarm.id, !alarm.enabled)}
                />
              </View>
            );
          })}
        </Card>
      )}

      {alarms.alarms.length > 0 ? (
        <AddButton label={t("tasks.alarms.new")} onPress={() => onOpen()} />
      ) : null}

      {permissions.supported && !permissions.exact ? (
        <Notice
          icon="bell"
          text={t("tasks.alarms.exactNotice")}
          action={t("tasks.alarms.allowInSettings")}
          onAction={openExactAlarmSettings}
        />
      ) : null}
      {permissions.supported && permissions.exact && !permissions.fullScreen ? (
        <Notice
          icon="lock"
          text={t("tasks.alarms.fullScreenNotice")}
          action={t("tasks.alarms.allowInSettings")}
          onAction={openFullScreenSettings}
        />
      ) : null}
    </AsyncBoundary>
  );
}

function Notice({
  icon,
  text,
  action,
  onAction,
}: {
  icon: IconName;
  text: string;
  action?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: OC.amberBg,
        borderRadius: RADIUS.inner,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginVertical: 12,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <Icon name={icon} size={17} color={OC.amberInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontFamily: FONT.bodySemi, fontSize: 13, lineHeight: 19, color: OC.amberInk }}
        >
          {text}
        </Text>
        {action && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => ({ marginTop: 6, opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{
                fontFamily: FONT.bodyX,
                fontSize: 13,
                color: OC.amberInk,
                textDecorationLine: "underline",
              }}
            >
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
