import { View, Text, StyleSheet } from "react-native";

export function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Phase 1 Target (Weeks 1-8)</Text>
        <Text>Complete Digital + Verilog + STA fundamentals and 100+ MCQ practice attempts.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Phase 2 Target (Weeks 9-20)</Text>
        <Text>Finish SystemVerilog/UVM/SVA and start protocol-based coding rounds.</Text>
      </View>
      <View style={styles.cardPremium}>
        <Text style={styles.heading}>Phase 3 Target (Premium)</Text>
        <Text>Solve interview packs and topic-focused hard sets for placements.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  heading: { fontWeight: "700", marginBottom: 4 },
  card: { backgroundColor: "#eef2ff", borderRadius: 12, padding: 12, marginBottom: 10 },
  cardPremium: { backgroundColor: "#fff7ed", borderRadius: 12, padding: 12 },
});
