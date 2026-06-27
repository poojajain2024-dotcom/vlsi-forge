from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.entities import Bookmark, MCQQuestion, CodingQuestion, User, UserStreak
from app.schemas.common import BookmarkIn, BookmarkOut, LeaderboardEntry, StreakOut

router = APIRouter(prefix="/user", tags=["user"])


def _get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def _update_streak(user: User, db: Session) -> None:
    streak = db.query(UserStreak).filter(UserStreak.user_id == user.id).first()
    today = date.today()
    if streak is None:
        streak = UserStreak(user_id=user.id, current_streak=1, longest_streak=1,
                            last_activity_date=datetime.utcnow(), total_quizzes=1, total_correct=0)
        db.add(streak)
    else:
        streak.total_quizzes += 1
        last = streak.last_activity_date.date() if streak.last_activity_date else None
        if last is None or (today - last).days > 1:
            streak.current_streak = 1
        elif (today - last).days == 1:
            streak.current_streak += 1
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        streak.last_activity_date = datetime.utcnow()
    db.commit()


# ── Streak ──────────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakOut)
def get_streak(current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)) -> StreakOut:
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    if streak is None:
        return StreakOut(current_streak=0, longest_streak=0, total_quizzes=0,
                         total_correct=0, last_activity_date=None)
    return StreakOut(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        total_quizzes=streak.total_quizzes,
        total_correct=streak.total_correct,
        last_activity_date=streak.last_activity_date,
    )


@router.post("/streak/ping", response_model=StreakOut)
def ping_streak(current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)) -> StreakOut:
    """Call this after a quiz or coding submission to update the streak."""
    _update_streak(current_user, db)
    return get_streak(current_user=current_user, db=db)


# ── Bookmarks ────────────────────────────────────────────────────────────────

@router.get("/bookmarks", response_model=list[BookmarkOut])
def list_bookmarks(current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)):
    return db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()


@router.post("/bookmarks", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED)
def add_bookmark(payload: BookmarkIn, current_user: User = Depends(_get_current_user),
                 db: Session = Depends(get_db)) -> BookmarkOut:
    if payload.mcq_id is None and payload.coding_id is None:
        raise HTTPException(status_code=400, detail="Provide mcq_id or coding_id")
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.mcq_id == payload.mcq_id,
        Bookmark.coding_id == payload.coding_id,
    ).first()
    if existing:
        return existing
    bm = Bookmark(user_id=current_user.id, mcq_id=payload.mcq_id, coding_id=payload.coding_id)
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm


@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(bookmark_id: int, current_user: User = Depends(_get_current_user),
                    db: Session = Depends(get_db)) -> None:
    bm = db.query(Bookmark).filter(Bookmark.id == bookmark_id,
                                   Bookmark.user_id == current_user.id).first()
    if bm is None:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()


# ── Leaderboard ──────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db)) -> list[LeaderboardEntry]:
    rows = (
        db.query(User, UserStreak)
        .join(UserStreak, UserStreak.user_id == User.id)
        .order_by(UserStreak.current_streak.desc(), UserStreak.total_correct.desc())
        .limit(20)
        .all()
    )
    return [
        LeaderboardEntry(
            rank=i + 1,
            full_name=user.full_name,
            current_streak=streak.current_streak,
            total_quizzes=streak.total_quizzes,
            total_correct=streak.total_correct,
        )
        for i, (user, streak) in enumerate(rows)
    ]
