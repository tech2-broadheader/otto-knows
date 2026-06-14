// Small presentational UI primitives shared across screens. Styling via
// NativeWind; accessibility labels/roles wired (CODING_CONVENTIONS §9, §10).
// No data/business logic here.
import { Pressable, Switch, Text, TextInput, View } from "react-native";

/** A titled card section. */
export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      {title ? <Text className="mb-2 text-base font-semibold text-slate-900">{title}</Text> : null}
      {children}
    </View>
  );
}

/** A labeled text input. The label is the input's accessibility label. */
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-slate-600">{label}</Text>
      <TextInput
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Primary / secondary / danger button. */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}): React.JSX.Element {
  const base = "rounded-xl px-4 py-3 items-center";
  const styles: Record<string, string> = {
    primary: "bg-slate-900",
    secondary: "bg-slate-200",
    danger: "bg-red-600",
  };
  const textStyles: Record<string, string> = {
    primary: "text-white",
    secondary: "text-slate-900",
    danger: "text-white",
  };
  return (
    <Pressable
      className={`${base} ${styles[variant]} ${disabled ? "opacity-40" : ""}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text className={`font-semibold ${textStyles[variant]}`}>{label}</Text>
    </Pressable>
  );
}

/** A labeled toggle row (used for consent + done states). */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="mr-3 flex-1">
        <Text className="text-base font-medium text-slate-900">{label}</Text>
        {description ? <Text className="mt-0.5 text-sm text-slate-500">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

/** An inline banner — used for upgrade prompts at the free cap. */
export function Banner({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "warning";
}): React.JSX.Element {
  const toneClass =
    tone === "warning" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200";
  const textClass = tone === "warning" ? "text-amber-800" : "text-sky-800";
  return (
    <View className={`mb-3 rounded-xl border p-3 ${toneClass}`} accessibilityRole="text">
      <Text className={`text-sm ${textClass}`}>{message}</Text>
    </View>
  );
}
