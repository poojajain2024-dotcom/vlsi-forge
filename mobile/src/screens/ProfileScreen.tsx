import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  FeedbackSummary,
  fetchFeedbackSummary,
  fetchPremiumPlan,
  PremiumPlan,
  submitFeedback,
} from "../services/api";

export function ProfileScreen() {
  const [plan, setPlan] = useState<PremiumPlan | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchPremiumPlan()
      .then(setPlan)
      .catch(() => undefined);
    loadSummary();
  }, []);

  function loadSummary() {
    fetchFeedbackSummary()
      .then(setSummary)
      .catch(() => undefined);
  }

  async function sendFeedback() {
    if (rating < 1) {
      setStatus("Please pick a star rating first.");
      return;
    }
    setStatus("");
    try {
      await submitFeedback(rating, comment.trim(), displayName.trim());
      setStatus("Thanks for your feedback!");
      setComment("");
      setRating(0);
      loadSummary();
    } catch {
      setStatus("Could not send feedback. Check the backend connection.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Subscription</Text>
        <Text>Current: Free plan</Text>
        <Text>
          {plan ? `Upgrade: INR ${plan.monthly_price_inr}/month` : "Loading premium offer..."}
        </Text>
        <Text style={styles.muted}>Premium unlocks all interview MCQs & coding across subjects.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Rate this app</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)}>
              <Text style={[styles.star, n <= rating ? styles.starOn : styles.starOff]}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Your name (optional)"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="How can we improve this app?"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Pressable style={styles.button} onPress={sendFeedback}>
          <Text style={styles.buttonText}>Submit feedback</Text>
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {summary ? (
          <Text style={styles.muted}>
            Average {summary.average_rating}★ from {summary.total_reviews} reviews
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Certificates</Text>
        <Text>Complete subjects and clear threshold score to unlock certificates.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  heading: { fontWeight: "700", marginBottom: 4 },
  card: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 10 },
  muted: { color: "#64748b", marginTop: 6 },
  starRow: { flexDirection: "row", marginVertical: 8 },
  star: { fontSize: 34, marginRight: 6 },
  starOn: { color: "#f59e0b" },
  starOff: { color: "#cbd5e1" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#fff",
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  status: { color: "#0f766e", marginTop: 8 },
});
