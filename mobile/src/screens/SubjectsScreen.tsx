import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { fetchSubjects, Subject } from "../services/api";

export function SubjectsScreen() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch(() => setError("Unable to load subjects. Start backend and seed data."));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subjects</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              Phase {item.phase}
              {item.is_premium ? ` • Premium INR ${item.monthly_price_inr}/month` : " • Free"}
            </Text>
            <Text>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  error: { color: "#b91c1c", marginBottom: 8 },
  item: { backgroundColor: "#eef2ff", borderRadius: 10, padding: 12, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  meta: { color: "#1d4ed8", fontWeight: "600", marginBottom: 4 },
});
