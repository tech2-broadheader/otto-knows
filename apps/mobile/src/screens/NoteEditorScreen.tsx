// Note editor (story 12.1) — approved design "Note — edit & make a reminder":
// title, body, pin, delete, and "Make a reminder", which shows Otto's proposal
// card; the reminder is created only on "Yes, do it" (CLAUDE.md §1.11).
// Route params: { noteId } to edit; none to create.
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "@otto/schemas";
import { useNotes } from "../hooks/useNotes";
import { FormError } from "../components/money-ui";
import { Card, OverlayScreen, PrimaryButton, ProposalCard } from "../design/kit";
import { Icon } from "../design/Icon";
import { FONT, OC } from "../design/theme";
import { useMoney } from "../lib/settings-context";
import { t } from "../i18n";

type Params = { noteId?: string };
type Stage = "editing" | "proposed" | "accepted" | "dismissed";

export function NoteEditorScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const params = (useRoute().params ?? {}) as Params;
  const notes = useNotes();
  const money = useMoney();
  const existing = params.noteId ? notes.get(params.noteId) : undefined;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [noteId, setNoteId] = useState<string | undefined>(params.noteId);
  const [stage, setStage] = useState<Stage>("editing");
  const [error, setError] = useState<string | undefined>();
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || notes.state !== "ready") return;
    if (existing) {
      setTitle(existing.title ?? "");
      setBody(existing.body);
      setPinned(existing.pinned);
    }
    setPrefilled(true);
  }, [existing, notes.state, prefilled]);

  /** Save the note; returns its id, or undefined when there's nothing to save. */
  const persist = async (): Promise<string | undefined> => {
    if (body.trim() === "") {
      setError(t("tasks.noteEditor.bodyRequired"));
      return undefined;
    }
    setError(undefined);
    const saved = await notes.save({ title, body, pinned }, noteId);
    setNoteId(saved.id);
    return saved.id;
  };

  const done = async (): Promise<void> => {
    if (body.trim() === "" && !noteId) return navigation.goBack();
    if ((await persist()) !== undefined) navigation.goBack();
  };

  const proposeReminder = async (): Promise<void> => {
    if ((await persist()) !== undefined) setStage("proposed");
  };

  const acceptReminder = async (): Promise<void> => {
    const id = noteId;
    const note = id ? notes.get(id) : undefined;
    if (!note) return;
    await notes.makeReminder(note);
    setStage("accepted");
  };

  const confirmDelete = (): void => {
    if (!noteId) return navigation.goBack();
    Alert.alert(t("tasks.noteEditor.deleteConfirm"), t("tasks.noteEditor.deleteWarning"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => void notes.remove(noteId).then(() => navigation.goBack()),
      },
    ]);
  };

  const edited = existing ? money.shortDate(existing.updatedAt.slice(0, 10)) : undefined;

  return (
    <OverlayScreen
      title={t("tasks.noteEditor.title")}
      onBack={() => void done()}
      footer={
        <PrimaryButton
          label={t("tasks.noteEditor.makeReminder")}
          icon="bell"
          onPress={() => void proposeReminder()}
        />
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <Pressable
          onPress={() => setPinned((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={pinned ? t("tasks.noteEditor.unpin") : t("tasks.noteEditor.pin")}
          accessibilityState={{ selected: pinned }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: pinned ? OC.mist : OC.surface,
            borderWidth: 1,
            borderColor: pinned ? OC.mint : OC.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="pin" size={18} color={pinned ? OC.forest : OC.ink500} stroke={2.2} />
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel={t("tasks.noteEditor.delete")}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: OC.surface,
            borderWidth: 1,
            borderColor: OC.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="trash" size={18} color={OC.coralInk} />
        </Pressable>
      </View>

      <FormError message={error} />

      <Card style={{ gap: 10 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("tasks.noteEditor.titlePlaceholder")}
          placeholderTextColor={OC.ink400}
          maxLength={NOTE_TITLE_MAX}
          accessibilityLabel={t("tasks.noteEditor.titleLabel")}
          style={{ fontFamily: FONT.display, fontSize: 21, color: OC.ink, padding: 0 }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t("tasks.noteEditor.bodyPlaceholder")}
          placeholderTextColor={OC.ink400}
          maxLength={NOTE_BODY_MAX}
          multiline
          accessibilityLabel={t("tasks.noteEditor.bodyLabel")}
          style={{
            fontFamily: FONT.body,
            fontSize: 15,
            lineHeight: 23,
            color: OC.ink700,
            minHeight: 140,
            padding: 0,
            textAlignVertical: "top",
          }}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
            {edited ? t("tasks.noteEditor.edited", { date: edited }) : t("tasks.noteEditor.new")}
          </Text>
          <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
            {body.length.toLocaleString(money.locale)} /{" "}
            {NOTE_BODY_MAX.toLocaleString(money.locale)}
          </Text>
        </View>
      </Card>

      {stage !== "editing" ? (
        <View style={{ marginTop: 14 }}>
          <ProposalCard
            icon="bell"
            tone="green"
            title={t("tasks.noteEditor.proposalTitle", {
              title: title.trim() || (body.trim().split("\n")[0] ?? ""),
            })}
            detail={t("tasks.noteEditor.proposalDetail")}
            state={
              stage === "accepted" ? "accepted" : stage === "dismissed" ? "dismissed" : undefined
            }
            onAccept={() => void acceptReminder()}
            onDismiss={() => setStage("dismissed")}
          />
        </View>
      ) : null}
    </OverlayScreen>
  );
}
