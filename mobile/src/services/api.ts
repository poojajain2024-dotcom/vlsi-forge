const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type Subject = {
  id: number;
  slug: string;
  title: string;
  description: string;
  phase: number;
  is_premium: boolean;
  monthly_price_inr: number;
};

export async function fetchSubjects(): Promise<Subject[]> {
  return request<Subject[]>("/content/subjects");
}

export type MCQ = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

export type CodingQuestion = {
  id: number;
  title: string;
  prompt: string;
  constraints: string;
  expected_output: string;
  starter_code: string;
};

export type SubjectNote = {
  id: number;
  topic: string;
  title: string;
  content_markdown: string;
};

export type PremiumPlan = {
  plan_code: string;
  monthly_price_inr: number;
  description: string;
};

export async function fetchMcqsBySubject(subjectId: number, limit?: number): Promise<MCQ[]> {
  const query = typeof limit === "number" ? `?limit=${limit}` : "";
  return request<MCQ[]>(`/content/subjects/${subjectId}/mcqs${query}`);
}

export async function fetchCodingBySubject(subjectId: number): Promise<CodingQuestion[]> {
  return request<CodingQuestion[]>(`/content/subjects/${subjectId}/coding`);
}

export async function fetchInterviewMcqsBySubject(subjectId: number): Promise<MCQ[]> {
  return request<MCQ[]>(`/content/subjects/${subjectId}/interview/mcqs`);
}

export type InterviewCodingQuestion = CodingQuestion & {
  is_interview: boolean;
  company: string;
  topic: string;
  test_case_count: number;
};

export async function fetchInterviewCodingBySubject(
  subjectId: number,
): Promise<InterviewCodingQuestion[]> {
  return request<InterviewCodingQuestion[]>(`/content/subjects/${subjectId}/interview/coding`);
}

export async function fetchNotesBySubject(subjectId: number): Promise<SubjectNote[]> {
  return request<SubjectNote[]>(`/content/subjects/${subjectId}/notes`);
}

export async function fetchPremiumPlan(): Promise<PremiumPlan> {
  return request<PremiumPlan>("/content/plans/premium");
}

export type Tutorial = {
  id: number;
  topic: string;
  title: string;
  content_markdown: string;
  order_index: number;
  reading_minutes: number;
};

export async function fetchTutorialsBySubject(subjectId: number): Promise<Tutorial[]> {
  return request<Tutorial[]>(`/content/subjects/${subjectId}/tutorials`);
}

export type QuizAnswer = {
  mcq_id: number;
  selected_option: string;
};

export type QuizAnswerResult = {
  mcq_id: number;
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  explanation: string;
};

export type QuizResult = {
  total_questions: number;
  correct_count: number;
  score_percent: number;
  time_seconds: number;
  grade: string;
  results: QuizAnswerResult[];
};

export async function submitQuiz(
  subjectId: number | null,
  timeSeconds: number,
  answers: QuizAnswer[],
): Promise<QuizResult> {
  return request<QuizResult>("/progress/quiz/submit", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId, time_seconds: timeSeconds, answers }),
  });
}

export type CodingResult = {
  coding_question_id: number;
  tests_total: number;
  tests_passed: number;
  all_passed: boolean;
  time_seconds: number;
  score: number;
  message: string;
};

export async function submitCoding(
  codingQuestionId: number,
  testsTotal: number,
  testsPassed: number,
  timeSeconds: number,
): Promise<CodingResult> {
  return request<CodingResult>("/progress/coding/submit", {
    method: "POST",
    body: JSON.stringify({
      coding_question_id: codingQuestionId,
      tests_total: testsTotal,
      tests_passed: testsPassed,
      time_seconds: timeSeconds,
    }),
  });
}

export type FeedbackSummary = {
  total_reviews: number;
  average_rating: number;
  distribution: Record<string, number>;
  recent: { id: number; rating: number; comment: string; display_name: string }[];
};

export async function submitFeedback(
  rating: number,
  comment: string,
  displayName: string,
): Promise<void> {
  await request("/feedback", {
    method: "POST",
    body: JSON.stringify({ rating, comment, display_name: displayName }),
  });
}

export async function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  return request<FeedbackSummary>("/feedback/summary");
}
