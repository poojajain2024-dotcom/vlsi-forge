import argparse
import json
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.entities import CodingQuestion, MCQQuestion, Subject, SubjectNote, Tutorial


def ensure_sqlite_schema(db: Session) -> None:
    settings = get_settings()
    if not settings.database_url.startswith("sqlite"):
        return

    # Lightweight sqlite migration for local dev when model fields are added.
    columns = db.execute(text("PRAGMA table_info(subjects)")).fetchall()
    column_names = {row[1] for row in columns}

    if "phase" not in column_names:
        db.execute(text("ALTER TABLE subjects ADD COLUMN phase INTEGER NOT NULL DEFAULT 1"))
    if "is_premium" not in column_names:
        db.execute(text("ALTER TABLE subjects ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0"))
    if "monthly_price_inr" not in column_names:
        db.execute(text("ALTER TABLE subjects ADD COLUMN monthly_price_inr INTEGER NOT NULL DEFAULT 0"))

    mcq_columns = {row[1] for row in db.execute(text("PRAGMA table_info(mcq_questions)")).fetchall()}
    if mcq_columns and "is_premium" not in mcq_columns:
        db.execute(text("ALTER TABLE mcq_questions ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0"))
    if mcq_columns and "is_interview" not in mcq_columns:
        db.execute(text("ALTER TABLE mcq_questions ADD COLUMN is_interview BOOLEAN NOT NULL DEFAULT 0"))
    if mcq_columns and "company" not in mcq_columns:
        db.execute(text("ALTER TABLE mcq_questions ADD COLUMN company VARCHAR(120) NOT NULL DEFAULT ''"))
    if mcq_columns and "topic" not in mcq_columns:
        db.execute(text("ALTER TABLE mcq_questions ADD COLUMN topic VARCHAR(160) NOT NULL DEFAULT ''"))

    coding_columns = {row[1] for row in db.execute(text("PRAGMA table_info(coding_questions)")).fetchall()}
    if coding_columns and "difficulty" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN difficulty VARCHAR(20) NOT NULL DEFAULT 'easy'"))
    if coding_columns and "is_premium" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0"))
    if coding_columns and "is_interview" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN is_interview BOOLEAN NOT NULL DEFAULT 0"))
    if coding_columns and "company" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN company VARCHAR(120) NOT NULL DEFAULT ''"))
    if coding_columns and "topic" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN topic VARCHAR(160) NOT NULL DEFAULT ''"))
    if coding_columns and "test_cases" not in coding_columns:
        db.execute(text("ALTER TABLE coding_questions ADD COLUMN test_cases TEXT NOT NULL DEFAULT '[]'"))

    db.commit()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def upsert_subjects(db: Session, items: list[dict]) -> dict[str, int]:
    subject_map: dict[str, int] = {}

    for item in items:
        subject = db.query(Subject).filter(Subject.slug == item["slug"]).first()
        if not subject:
            subject = Subject(
                slug=item["slug"],
                title=item["title"],
                description=item["description"],
                phase=item.get("phase", 1),
                is_premium=item.get("is_premium", False),
                monthly_price_inr=item.get("monthly_price_inr", 0),
            )
            db.add(subject)
            db.flush()
        else:
            subject.title = item["title"]
            subject.description = item["description"]
            subject.phase = item.get("phase", 1)
            subject.is_premium = item.get("is_premium", False)
            subject.monthly_price_inr = item.get("monthly_price_inr", 0)

        subject_map[item["slug"]] = subject.id

    return subject_map


def insert_mcqs(db: Session, items: list[dict], subject_map: dict[str, int]) -> None:
    by_subject_ids = {subject_map[item["subject_slug"]] for item in items}
    if by_subject_ids:
        db.query(MCQQuestion).filter(MCQQuestion.subject_id.in_(by_subject_ids)).delete(synchronize_session=False)

    for item in items:
        slug = item["subject_slug"]
        is_interview = bool(item.get("is_interview", False)) or slug.startswith("interview-")
        db.add(
            MCQQuestion(
                subject_id=subject_map[slug],
                question_text=item["question_text"],
                option_a=item["option_a"],
                option_b=item["option_b"],
                option_c=item["option_c"],
                option_d=item["option_d"],
                correct_option=item["correct_option"],
                explanation=item["explanation"],
                difficulty=item.get("difficulty", "easy"),
                is_premium=bool(item.get("is_premium", False)) or is_interview,
                is_interview=is_interview,
                company=item.get("company", ""),
                topic=item.get("topic", ""),
            )
        )


def insert_coding_questions(db: Session, items: list[dict], subject_map: dict[str, int]) -> None:
    by_subject_ids = {subject_map[item["subject_slug"]] for item in items}
    if by_subject_ids:
        db.query(CodingQuestion).filter(CodingQuestion.subject_id.in_(by_subject_ids)).delete(synchronize_session=False)

    for item in items:
        slug = item["subject_slug"]
        is_interview = bool(item.get("is_interview", False)) or slug.startswith("interview-")
        db.add(
            CodingQuestion(
                subject_id=subject_map[slug],
                title=item["title"],
                prompt=item["prompt"],
                constraints=item["constraints"],
                expected_output=item["expected_output"],
                starter_code=item["starter_code"],
                solution_code=item["solution_code"],
                difficulty=item.get("difficulty", "easy"),
                is_premium=bool(item.get("is_premium", False)) or is_interview,
                is_interview=is_interview,
                company=item.get("company", ""),
                topic=item.get("topic", ""),
                test_cases=json.dumps(item.get("test_cases", [])),
            )
        )


def insert_notes(db: Session, items: list[dict], subject_map: dict[str, int]) -> None:
    by_subject_ids = {subject_map[item["subject_slug"]] for item in items}
    if by_subject_ids:
        db.query(SubjectNote).filter(SubjectNote.subject_id.in_(by_subject_ids)).delete(synchronize_session=False)

    for item in items:
        db.add(
            SubjectNote(
                subject_id=subject_map[item["subject_slug"]],
                topic=item["topic"],
                title=item["title"],
                content_markdown=item["content_markdown"],
            )
        )


def insert_tutorials(db: Session, items: list[dict], subject_map: dict[str, int]) -> None:
    by_subject_ids = {subject_map[item["subject_slug"]] for item in items}
    if by_subject_ids:
        db.query(Tutorial).filter(Tutorial.subject_id.in_(by_subject_ids)).delete(synchronize_session=False)

    for index, item in enumerate(items):
        db.add(
            Tutorial(
                subject_id=subject_map[item["subject_slug"]],
                topic=item["topic"],
                title=item["title"],
                content_markdown=item["content_markdown"],
                order_index=item.get("order_index", index),
                reading_minutes=item.get("reading_minutes", 5),
            )
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import subjects, MCQs, and coding questions from JSON files")
    parser.add_argument("--subjects", required=True)
    parser.add_argument("--mcqs", required=True, nargs="+")
    parser.add_argument("--coding", required=True, nargs="+")
    parser.add_argument("--notes", required=True, nargs="+")
    parser.add_argument("--tutorials", nargs="+", default=[])
    args = parser.parse_args()

    # Ensure all current model tables exist in the target DB.
    Base.metadata.create_all(bind=engine)

    def load_many(paths: list[str]) -> list[dict]:
        merged: list[dict] = []
        for path in paths:
            merged.extend(load_json(Path(path)))
        return merged

    subjects = load_json(Path(args.subjects))
    mcqs = load_many(args.mcqs)
    coding = load_many(args.coding)
    notes = load_many(args.notes)
    tutorials = load_many(args.tutorials) if args.tutorials else []

    db = SessionLocal()
    try:
        ensure_sqlite_schema(db)
        subject_map = upsert_subjects(db, subjects)
        insert_mcqs(db, mcqs, subject_map)
        insert_coding_questions(db, coding, subject_map)
        insert_notes(db, notes, subject_map)
        if tutorials:
            insert_tutorials(db, tutorials, subject_map)
        db.commit()
        print("Import complete")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
