from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Feedback
from app.schemas.common import FeedbackIn, FeedbackOut, FeedbackSummaryOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut)
def submit_feedback(payload: FeedbackIn, db: Session = Depends(get_db)) -> Feedback:
    """Save a 1-5 star rating and an optional 'how can we improve' comment."""
    feedback = Feedback(
        rating=payload.rating,
        comment=payload.comment.strip(),
        display_name=payload.display_name.strip(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/summary", response_model=FeedbackSummaryOut)
def feedback_summary(db: Session = Depends(get_db)) -> FeedbackSummaryOut:
    """Average rating, total reviews, star distribution, and recent comments."""
    total = db.query(func.count(Feedback.id)).scalar() or 0
    avg = db.query(func.avg(Feedback.rating)).scalar() or 0.0

    distribution = {star: 0 for star in range(1, 6)}
    for star, count in db.query(Feedback.rating, func.count(Feedback.id)).group_by(Feedback.rating).all():
        distribution[int(star)] = count

    recent = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(20).all()

    return FeedbackSummaryOut(
        total_reviews=total,
        average_rating=round(float(avg), 2),
        distribution=distribution,
        recent=recent,
    )
