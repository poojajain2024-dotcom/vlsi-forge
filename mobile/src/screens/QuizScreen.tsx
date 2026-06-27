import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  fetchMcqsBySubject,
  fetchSubjects,
  MCQ,
  QuizResult,
  Subject,
  submitQuiz,
} from "../services/api";

const OPTIONS: Array<{ key: string; label: keyof MCQ }> = [
  { key: "A", label: "option_a" },
  { key: "B", label: "option_b" },
  { key: "C", label: "option_c" },
  { key: "D", label: "option_d" },
];

export function QuizScreen() {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    fetchSubjects()
      .then((subjects) => {
        const first = subjects[0];
        if (!first) {
          setError("No subjects found. Import seed data first.");
          return;
        }
        setSubject(first);
        return fetchMcqsBySubject(first.id, 5);
      })
      .then((mcqs) => {
        if (mcqs && mcqs.length > 0) {
          setQuestions(mcqs);
          startRef.current = Date.now();
        }
      })
      .catch(() => setError("Unable to load quiz data. Start backend and import content."));
  }, []);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function selectOption(mcqId: number, optionKey: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [mcqId]: optionKey }));
  }

  async function handleSubmit() {
    if (!subject || questions.length === 0) return;
    setSubmitting(true);
    setError("");
    const timeSeconds = Math.round((Date.now() - startRef.current) / 1000);
    const payload = questions.map((q) => ({
      mcq_id: q.id,
      selected_option: answers[q.id] || "A",
    }));
    try {
      const res = await submitQuiz(subject.id, timeSeconds, payload);
      setResult(res);
    } catch {
      setError("Could not submit quiz. Check the backend connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    startRef.current = Date.now();
  }

  function resultFor(mcqId: number) {
    return result?.results.find((r) => r.mcq_id === mcqId) || null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quiz</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {subject ? <Text style={styles.meta}>Subject: {subject.title}</Text> : null}

      {result ? (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreBig}>{result.score_percent}%</Text>
          <Text style={styles.scoreGrade}>Grade: {result.grade}</Text>
          <Text style={styles.scoreLine}>
            {result.correct_count}/{result.total_questions} correct in {result.time_seconds}s
          </Text>
        </View>
      ) : (
        <Text style={styles.meta}>
          Answered {answeredCount}/{questions.length}
        </Text>
      )}

      {questions.map((q, idx) => {
        const r = resultFor(q.id);
        return (
          <View key={q.id} style={styles.card}>
            <Text style={styles.question}>
              {idx + 1}. {q.question_text}
            </Text>
            {OPTIONS.map((opt) => {
              const selected = answers[q.id] === opt.key;
              const isCorrect = r?.correct_option === opt.key;
              const isWrongPick = r && selected && !r.is_correct;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.option,
                    selected ? styles.optionSelected : null,
                    isCorrect ? styles.optionCorrect : null,
                    isWrongPick ? styles.optionWrong : null,
                  ]}
                  onPress={() => selectOption(q.id, opt.key)}
                >
                  <Text style={styles.optionText}>
                    {opt.key}) {q[opt.label] as string}
                  </Text>
                </Pressable>
              );
            })}
            {r ? <Text style={styles.explanation}>{r.explanation}</Text> : null}
          </View>
        );
      })}

      {questions.length > 0 ? (
        result ? (
          <Pressable style={styles.button} onPress={restart}>
            <Text style={styles.buttonText}>Try another set</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, submitting ? styles.buttonDisabled : null]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>{submitting ? "Scoring..." : "Submit quiz"}</Text>
          </Pressable>
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  meta: { color: "#334155", marginBottom: 8 },
  card: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 12 },
  question: { fontWeight: "700", marginBottom: 10 },
  option: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  optionSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  optionCorrect: { borderColor: "#16a34a", backgroundColor: "#dcfce7" },
  optionWrong: { borderColor: "#dc2626", backgroundColor: "#fee2e2" },
  optionText: { color: "#0f172a" },
  explanation: { marginTop: 8, color: "#475569", fontStyle: "italic" },
  error: { color: "#b91c1c", marginBottom: 8 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: "#94a3b8" },
  buttonText: { color: "#fff", fontWeight: "700" },
  scoreCard: {
    backgroundColor: "#ecfeff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  scoreBig: { fontSize: 40, fontWeight: "800", color: "#0e7490" },
  scoreGrade: { fontSize: 18, fontWeight: "700", color: "#0f766e", marginTop: 2 },
  scoreLine: { color: "#334155", marginTop: 4 },
});
