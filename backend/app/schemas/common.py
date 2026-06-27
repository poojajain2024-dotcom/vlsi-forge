from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class HealthResponse(BaseModel):
    status: str
    app: str


class SubjectOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    phase: int
    is_premium: bool
    monthly_price_inr: int

    model_config = {"from_attributes": True}


class MCQOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    difficulty: str
    is_premium: bool
    is_interview: bool
    company: str
    topic: str

    model_config = {"from_attributes": True}


class CodingQuestionOut(BaseModel):
    id: int
    title: str
    prompt: str
    constraints: str
    expected_output: str
    starter_code: str
    difficulty: str
    is_premium: bool
    is_interview: bool
    company: str
    topic: str
    test_case_count: int

    model_config = {"from_attributes": True}


class SubjectNoteOut(BaseModel):
    id: int
    topic: str
    title: str
    content_markdown: str

    model_config = {"from_attributes": True}


class TutorialOut(BaseModel):
    id: int
    topic: str
    title: str
    content_markdown: str
    order_index: int
    reading_minutes: int

    model_config = {"from_attributes": True}


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    display_name: str = ""


class FeedbackOut(BaseModel):
    id: int
    rating: int
    comment: str
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackSummaryOut(BaseModel):
    total_reviews: int
    average_rating: float
    distribution: dict[int, int]
    recent: list[FeedbackOut]


class QuizAnswerIn(BaseModel):
    mcq_id: int
    selected_option: str = Field(pattern="^[ABCD]$")


class QuizSubmitIn(BaseModel):
    subject_id: int | None = None
    time_seconds: int = 0
    answers: list[QuizAnswerIn]


class QuizAnswerResult(BaseModel):
    mcq_id: int
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str


class QuizResultOut(BaseModel):
    total_questions: int
    correct_count: int
    score_percent: int
    time_seconds: int
    grade: str
    results: list[QuizAnswerResult]


class CodingSubmitIn(BaseModel):
    coding_question_id: int
    tests_total: int = Field(ge=0)
    tests_passed: int = Field(ge=0)
    time_seconds: int = Field(ge=0, default=0)


class CodingResultOut(BaseModel):
    coding_question_id: int
    tests_total: int
    tests_passed: int
    all_passed: bool
    time_seconds: int
    score: int
    message: str


class PremiumPlanOut(BaseModel):
    plan_code: str
    monthly_price_inr: int
    description: str


class PreviewInfoOut(BaseModel):
    subject_id: int
    slug: str
    title: str
    is_premium_subject: bool
    mcq_total: int
    free_count: int
    locked_count: int
    unlock_message: str


class SubjectStatsOut(BaseModel):
    subject_id: int
    slug: str
    title: str
    phase: int
    is_premium: bool
    mcq_total: int
    mcq_easy: int
    mcq_medium: int
    mcq_hard: int
    coding_total: int
    notes_total: int


class ContentStatsOut(BaseModel):
    subjects: int
    mcq_total: int
    coding_total: int
    notes_total: int
    per_subject: list[SubjectStatsOut]


class RegisterIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BookmarkIn(BaseModel):
    mcq_id: int | None = None
    coding_id: int | None = None


class BookmarkOut(BaseModel):
    id: int
    mcq_id: int | None
    coding_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    total_quizzes: int
    total_correct: int
    last_activity_date: datetime | None

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    full_name: str
    current_streak: int
    total_quizzes: int
    total_correct: int
