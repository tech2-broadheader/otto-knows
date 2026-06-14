import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { greeting } from "@otto/core";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Otto</Text>
      <Text style={styles.subtitle}>{greeting("there")}</Text>
      <Text style={styles.note}>
        Phase 1 organizer core scaffold. Routine, reminders and the daily brief land here.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#fff",
  },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 16, marginTop: 8 },
  note: { fontSize: 13, color: "#666", marginTop: 16, textAlign: "center" },
});
