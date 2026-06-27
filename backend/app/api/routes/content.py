from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import CodingQuestion, MCQQuestion, Subject, SubjectNote, Tutorial
from app.schemas.common import (
    CodingQuestionOut,
    ContentStatsOut,
    MCQOut,
    PremiumPlanOut,
    PreviewInfoOut,
    SubjectNoteOut,
    SubjectOut,
    SubjectStatsOut,
    TutorialOut,
)

router = APIRouter(prefix="/content", tags=["content"])

# Premium model: regular learning content (tutorials, notes, practice MCQs and
# coding) is FREE. Only interview questions (MCQs + coding asked by companies)
# are premium. Free users still get a small preview of interview content so they
# can see the value before subscribing (INR 299/month).
INTERVIEW_PREVIEW_LIMIT = 5


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(
    phase: int | None = Query(default=None, ge=1, le=3),
    include_premium: bool = False,
    db: Session = Depends(get_db),
) -> list[Subject]:
    query = db.query(Subject)
    if phase is not None:
        query = query.filter(Subject.phase == phase)
    if not include_premium:
        query = query.filter(Subject.is_premium.is_(False))
    return query.order_by(Subject.phase.asc(), Subject.id.asc()).all()


@router.get("/subjects/{subject_id}/mcqs", response_model=list[MCQOut])
def list_mcqs(
    subject_id: int,
    limit: int = 50,
    difficulty: str | None = Query(default=None, pattern="^(easy|medium|hard)$"),
    db: Session = Depends(get_db),
) -> list[MCQQuestion]:
    """Free practice MCQs for a subject (non-interview learning questions)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    query = db.query(MCQQuestion).filter(
        MCQQuestion.subject_id == subject_id,
        MCQQuestion.is_interview.is_(False),
    )
    if difficulty is not None:
        query = query.filter(MCQQuestion.difficulty == difficulty)

    return query.order_by(MCQQuestion.id.asc()).limit(limit).all()


@router.get("/subjects/{subject_id}/interview/mcqs", response_model=list[MCQOut])
def list_interview_mcqs(
    subject_id: int,
    limit: int = 50,
    include_premium: bool = False,
    db: Session = Depends(get_db),
) -> list[MCQQuestion]:
    """Premium interview MCQs (company-asked). Free users get a short preview."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    query = db.query(MCQQuestion).filter(
        MCQQuestion.subject_id == subject_id,
        MCQQuestion.is_interview.is_(True),
    )
    if not include_premium:
        limit = min(limit, INTERVIEW_PREVIEW_LIMIT)
    return query.order_by(MCQQuestion.id.asc()).limit(limit).all()


@router.get("/subjects/{subject_id}/coding", response_model=list[CodingQuestionOut])
def list_coding_questions(
    subject_id: int,
    limit: int = 50,
    difficulty: str | None = Query(default=None, pattern="^(easy|medium|hard)$"),
    db: Session = Depends(get_db),
) -> list[CodingQuestion]:
    """Free practice coding questions (non-interview)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    query = db.query(CodingQuestion).filter(
        CodingQuestion.subject_id == subject_id,
        CodingQuestion.is_interview.is_(False),
    )
    if difficulty is not None:
        query = query.filter(CodingQuestion.difficulty == difficulty)

    return query.order_by(CodingQuestion.id.asc()).limit(limit).all()


@router.get("/subjects/{subject_id}/interview/coding", response_model=list[CodingQuestionOut])
def list_interview_coding(
    subject_id: int,
    limit: int = 50,
    include_premium: bool = False,
    db: Session = Depends(get_db),
) -> list[CodingQuestion]:
    """Premium interview coding questions. Free users get a short preview."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    query = db.query(CodingQuestion).filter(
        CodingQuestion.subject_id == subject_id,
        CodingQuestion.is_interview.is_(True),
    )
    if not include_premium:
        limit = min(limit, INTERVIEW_PREVIEW_LIMIT)
    return query.order_by(CodingQuestion.id.asc()).limit(limit).all()


@router.get("/subjects/{subject_id}/notes", response_model=list[SubjectNoteOut])
def list_subject_notes(
    subject_id: int,
    db: Session = Depends(get_db),
) -> list[SubjectNote]:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    return db.query(SubjectNote).filter(SubjectNote.subject_id == subject_id).order_by(SubjectNote.id.asc()).all()


@router.get("/subjects/{subject_id}/tutorials", response_model=list[TutorialOut])
def list_tutorials(
    subject_id: int,
    db: Session = Depends(get_db),
) -> list[Tutorial]:
    """GeeksforGeeks-style tutorials for a subject, ordered as a learning path."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    return (
        db.query(Tutorial)
        .filter(Tutorial.subject_id == subject_id)
        .order_by(Tutorial.order_index.asc(), Tutorial.id.asc())
        .all()
    )


@router.get("/subjects/{subject_id}/preview", response_model=PreviewInfoOut)
def subject_preview(subject_id: int, db: Session = Depends(get_db)) -> PreviewInfoOut:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    mcq_total = db.query(MCQQuestion).filter(MCQQuestion.subject_id == subject_id).count()
    interview_total = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.subject_id == subject_id, MCQQuestion.is_interview.is_(True))
        .count()
    )
    free_count = mcq_total - interview_total + min(interview_total, INTERVIEW_PREVIEW_LIMIT)
    return PreviewInfoOut(
        subject_id=subject.id,
        slug=subject.slug,
        title=subject.title,
        is_premium_subject=subject.is_premium,
        mcq_total=mcq_total,
        free_count=free_count,
        locked_count=max(0, mcq_total - free_count),
        unlock_message="Practice content is free. Install the app and subscribe (INR 299/month) to unlock all interview questions.",
    )


@router.get("/plans/premium", response_model=PremiumPlanOut)
def premium_plan() -> PremiumPlanOut:
    return PremiumPlanOut(
        plan_code="phase3_premium",
        monthly_price_inr=299,
        description="Phase 3 premium interview packs: company-focused MCQs, notes, and coding rounds.",
    )


@router.get("/stats", response_model=ContentStatsOut)
def content_stats(db: Session = Depends(get_db)) -> ContentStatsOut:
    subjects = db.query(Subject).order_by(Subject.phase.asc(), Subject.id.asc()).all()

    per_subject: list[SubjectStatsOut] = []
    total_mcq = 0
    total_coding = 0
    total_notes = 0

    for subject in subjects:
        mcq_easy = (
            db.query(MCQQuestion)
            .filter(MCQQuestion.subject_id == subject.id, MCQQuestion.difficulty == "easy")
            .count()
        )
        mcq_medium = (
            db.query(MCQQuestion)
            .filter(MCQQuestion.subject_id == subject.id, MCQQuestion.difficulty == "medium")
            .count()
        )
        mcq_hard = (
            db.query(MCQQuestion)
            .filter(MCQQuestion.subject_id == subject.id, MCQQuestion.difficulty == "hard")
            .count()
        )
        mcq_total = mcq_easy + mcq_medium + mcq_hard
        coding_total = db.query(CodingQuestion).filter(CodingQuestion.subject_id == subject.id).count()
        notes_total = db.query(SubjectNote).filter(SubjectNote.subject_id == subject.id).count()

        total_mcq += mcq_total
        total_coding += coding_total
        total_notes += notes_total

        per_subject.append(
            SubjectStatsOut(
                subject_id=subject.id,
                slug=subject.slug,
                title=subject.title,
                phase=subject.phase,
                is_premium=subject.is_premium,
                mcq_total=mcq_total,
                mcq_easy=mcq_easy,
                mcq_medium=mcq_medium,
                mcq_hard=mcq_hard,
                coding_total=coding_total,
                notes_total=notes_total,
            )
        )

    return ContentStatsOut(
        subjects=len(subjects),
        mcq_total=total_mcq,
        coding_total=total_coding,
        notes_total=total_notes,
        per_subject=per_subject,
    )
