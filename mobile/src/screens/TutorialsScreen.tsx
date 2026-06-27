import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSubjects, fetchTutorialsBySubject, Subject, Tutorial } from "../services/api";

export function TutorialsScreen() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSubjects()
      .then((data) => {
        setSubjects(data);
        const first = data[0];
        if (first) {
          setActiveSubject(first);
        } else {
          setError("No subjects found. Import seed data first.");
        }
      })
      .catch(() => setError("Unable to load subjects. Start backend and import content."));
  }, []);

  useEffect(() => {
    if (!activeSubject) return;
    setOpenId(null);
    fetchTutorialsBySubject(activeSubject.id)
      .then(setTutorials)
      .catch(() => setError("Unable to load tutorials."));
  }, [activeSubject]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tutorials</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.chip, activeSubject?.id === s.id ? styles.chipActive : null]}
            onPress={() => setActiveSubject(s)}
          >
            <Text
              style={[styles.chipText, activeSubject?.id === s.id ? styles.chipTextActive : null]}
            >
              {s.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tutorials.length === 0 ? (
        <Text style={styles.meta}>No tutorials for this subject yet.</Text>
      ) : (
        tutorials.map((t) => {
          const open = openId === t.id;
          return (
            <View key={t.id} style={styles.card}>
              <Pressable onPress={() => setOpenId(open ? null : t.id)}>
                <Text style={styles.lessonTitle}>{t.title}</Text>
                <Text style={styles.meta}>
                  {t.topic} • {t.reading_minutes} min read
                </Text>
              </Pressable>
              {open ? <Text style={styles.body}>{t.content_markdown}</Text> : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  error: { color: "#b91c1c", marginBottom: 8 },
  meta: { color: "#64748b", marginTop: 4 },
  chips: { flexDirection: "row", marginBottom: 12 },
  chip: {
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { color: "#1d4ed8", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 10 },
  lessonTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  body: { marginTop: 10, color: "#1e293b", lineHeight: 20 },
});
