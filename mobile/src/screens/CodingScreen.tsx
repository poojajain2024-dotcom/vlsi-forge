import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  CodingResult,
  fetchInterviewCodingBySubject,
  fetchSubjects,
  InterviewCodingQuestion,
  submitCoding,
} from "../services/api";

export function CodingScreen() {
  const [question, setQuestion] = useState<InterviewCodingQuestion | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [passedTests, setPassedTests] = useState(0);
  const [result, setResult] = useState<CodingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    fetchSubjects()
      .then(async (subjects) => {
        for (const subject of subjects) {
          const coding = await fetchInterviewCodingBySubject(subject.id);
          if (coding.length > 0) {
            setQuestion(coding[0]);
            startRef.current = Date.now();
            return;
          }
        }
        setError("No interview coding questions available yet.");
      })
      .catch(() => setError("Unable to load coding data."));
  }, []);

  useEffect(() => {
    if (result) return;
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [result]);

  const total = question?.test_case_count || 0;

  async function handleSubmit() {
    if (!question) return;
    setSubmitting(true);
    setError("");
    const timeSeconds = Math.round((Date.now() - startRef.current) / 1000);
    try {
      const res = await submitCoding(question.id, total, passedTests, timeSeconds);
      setResult(res);
    } catch {
      setError("Could not submit solution. Check the backend connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setResult(null);
    setPassedTests(0);
    setElapsed(0);
    startRef.current = Date.now();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Coding</Text>
        <Text style={styles.timer}>{elapsed}s</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {question ? (
        <View style={styles.card}>
          <Text style={styles.qtitle}>{question.title}</Text>
          {question.topic ? <Text style={styles.badge}>{question.topic}</Text> : null}
          <Text>{question.prompt}</Text>
          <Text style={styles.section}>Constraints</Text>
          <Text>{question.constraints}</Text>
          <Text style={styles.section}>Expected Output</Text>
          <Text>{question.expected_output}</Text>
          <Text style={styles.section}>Test cases: {total}</Text>

          {result ? (
            <View style={styles.scoreCard}>
              <Text style={styles.scoreBig}>{result.score}</Text>
              <Text style={styles.scoreLine}>
                {result.tests_passed}/{result.tests_total} test cases passed in{" "}
                {result.time_seconds}s
              </Text>
              <Text style={styles.scoreMsg}>{result.message}</Text>
              <Pressable style={styles.button} onPress={restart}>
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.section}>How many test cases passed?</Text>
              <View style={styles.counterRow}>
                <Pressable
                  style={styles.counterBtn}
                  onPress={() => setPassedTests((v) => Math.max(0, v - 1))}
                >
                  <Text style={styles.counterText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>
                  {passedTests}/{total}
                </Text>
                <Pressable
                  style={styles.counterBtn}
                  onPress={() => setPassedTests((v) => Math.min(total, v + 1))}
                >
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.button, submitting ? styles.buttonDisabled : null]}
                disabled={submitting}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Scoring..." : "Submit solution"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <Text>Loading coding problem...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  timer: { fontSize: 18, fontWeight: "700", color: "#0e7490" },
  card: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12 },
  qtitle: { fontWeight: "700", marginBottom: 6, fontSize: 16 },
  badge: { color: "#7c3aed", fontWeight: "700", marginBottom: 8 },
  section: { marginTop: 10, fontWeight: "700" },
  error: { color: "#b91c1c", marginBottom: 8 },
  counterRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  counterBtn: {
    backgroundColor: "#e2e8f0",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  counterValue: { fontSize: 18, fontWeight: "700", marginHorizontal: 18 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#94a3b8" },
  buttonText: { color: "#fff", fontWeight: "700" },
  scoreCard: { backgroundColor: "#ecfeff", borderRadius: 12, padding: 16, marginTop: 12, alignItems: "center" },
  scoreBig: { fontSize: 40, fontWeight: "800", color: "#0e7490" },
  scoreLine: { color: "#334155", marginTop: 4 },
  scoreMsg: { color: "#0f766e", marginTop: 6, textAlign: "center" },
});
