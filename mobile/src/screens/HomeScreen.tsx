import { View, Text, StyleSheet } from "react-native";

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VLSI Forge</Text>
      <Text style={styles.subtitle}>Digital Electronics, Verilog, STA, SystemVerilog, UVM, and interview packs.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How this helps students</Text>
        <Text>1) Learn with notes</Text>
        <Text>2) Practice MCQs with explanations</Text>
        <Text>3) Solve coding questions for interviews</Text>
      </View>
      <View style={styles.cardPremium}>
        <Text style={styles.cardTitle}>Phase 3 Premium</Text>
        <Text>INR 299/month for advanced interview question packs.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { marginBottom: 14, color: "#334155" },
  card: { backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, marginBottom: 10 },
  cardPremium: { backgroundColor: "#fff7ed", borderRadius: 12, padding: 12 },
  cardTitle: { fontWeight: "700", marginBottom: 6 },
});
