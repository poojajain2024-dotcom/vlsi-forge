import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import CodingQuestion, CodingSubmission, MCQQuestion, QuizResult
from app.schemas.common import (
    CodingResultOut,
    CodingSubmitIn,
    QuizAnswerResult,
    QuizResultOut,
    QuizSubmitIn,
)

router = APIRouter(prefix="/progress", tags=["progress"])


def _grade(score_percent: int) -> str:
    if score_percent >= 90:
        return "A+"
    if score_percent >= 75:
        return "A"
    if score_percent >= 60:
        return "B"
    if score_percent >= 40:
        return "C"
    return "Needs practice"


@router.post("/quiz/submit", response_model=QuizResultOut)
def submit_quiz(payload: QuizSubmitIn, db: Session = Depends(get_db)) -> QuizResultOut:
    """Score a completed MCQ quiz: returns total, correct count, percent, and per-question results."""
    if not payload.answers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No answers submitted")

    mcq_ids = [a.mcq_id for a in payload.answers]
    questions = {q.id: q for q in db.query(MCQQuestion).filter(MCQQuestion.id.in_(mcq_ids)).all()}

    results: list[QuizAnswerResult] = []
    correct_count = 0
    for answer in payload.answers:
        question = questions.get(answer.mcq_id)
        if question is None:
            continue
        is_correct = answer.selected_option.upper() == question.correct_option.upper()
        if is_correct:
            correct_count += 1
        results.append(
            QuizAnswerResult(
                mcq_id=answer.mcq_id,
                selected_option=answer.selected_option.upper(),
                correct_option=question.correct_option.upper(),
                is_correct=is_correct,
                explanation=question.explanation,
            )
        )

    total = len(results)
    if total == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid questions found")

    score_percent = round(correct_count * 100 / total)

    db.add(
        QuizResult(
            subject_id=payload.subject_id,
            total_questions=total,
            correct_count=correct_count,
            score_percent=score_percent,
            time_seconds=payload.time_seconds,
        )
    )
    db.commit()

    return QuizResultOut(
        total_questions=total,
        correct_count=correct_count,
        score_percent=score_percent,
        time_seconds=payload.time_seconds,
        grade=_grade(score_percent),
        results=results,
    )


@router.post("/coding/submit", response_model=CodingResultOut)
def submit_coding(payload: CodingSubmitIn, db: Session = Depends(get_db)) -> CodingResultOut:
    """Record a coding attempt: time taken plus how many test cases passed, and compute a score."""
    question = db.query(CodingQuestion).filter(CodingQuestion.id == payload.coding_question_id).first()
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding question not found")

    try:
        defined_tests = len(json.loads(question.test_cases or "[]"))
    except (ValueError, TypeError):
        defined_tests = 0

    tests_total = payload.tests_total or defined_tests
    tests_passed = min(payload.tests_passed, tests_total) if tests_total else payload.tests_passed
    all_passed = tests_total > 0 and tests_passed == tests_total
    score = round(tests_passed * 100 / tests_total) if tests_total else 0

    if all_passed:
        message = f"All {tests_total} test cases passed in {payload.time_seconds}s. Great job!"
    elif tests_total:
        message = f"{tests_passed}/{tests_total} test cases passed. Keep iterating."
    else:
        message = "No test cases defined for this question."

    db.add(
        CodingSubmission(
            coding_question_id=question.id,
            tests_total=tests_total,
            tests_passed=tests_passed,
            all_passed=all_passed,
            time_seconds=payload.time_seconds,
            score=score,
        )
    )
    db.commit()

    return CodingResultOut(
        coding_question_id=question.id,
        tests_total=tests_total,
        tests_passed=tests_passed,
        all_passed=all_passed,
        time_seconds=payload.time_seconds,
        score=score,
        message=message,
    )
