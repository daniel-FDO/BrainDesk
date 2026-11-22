from collections.abc import Sequence
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.crud import apply_changes, changes_from, get_owned_or_404
from app.api.deps import CurrentUser, DbSession
from app.models import Course, Note, Resource, StudySession, User
from app.models.enums import SessionStatus
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate, NextSession

router = APIRouter(prefix="/courses", tags=["Courses"])


def _with_stats(db: Session, user: User, courses: Sequence[Course]) -> list[CourseRead]:
    """Counts and next session are matched to a course through its subject."""
    notes = dict(db.execute(
        select(Note.subject, func.count()).where(Note.user_id == user.id).group_by(Note.subject)
    ).all())
    resources = dict(db.execute(
        select(Resource.subject, func.count()).where(Resource.user_id == user.id).group_by(Resource.subject)
    ).all())
    # DISTINCT ON (subject): the earliest not-completed future session per subject.
    upcoming = db.scalars(
        select(StudySession)
        .where(
            StudySession.user_id == user.id,
            StudySession.status != SessionStatus.COMPLETED,
            StudySession.starts_at >= datetime.now(timezone.utc),
        )
        .order_by(StudySession.subject, StudySession.starts_at, StudySession.id)
        .distinct(StudySession.subject)
    ).all()
    next_by_subject = {s.subject: NextSession.model_validate(s) for s in upcoming}

    return [
        CourseRead.model_validate(c).model_copy(
            update={
                "notes_count": notes.get(c.subject, 0),
                "resources_count": resources.get(c.subject, 0),
                "next_session": next_by_subject.get(c.subject),
            }
        )
        for c in courses
    ]


def _commit_unique(db: Session, course: Course) -> None:
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You already have a course with that code")
    db.refresh(course)


@router.get("", response_model=list[CourseRead])
def list_courses(user: CurrentUser, db: DbSession):
    courses = db.scalars(select(Course).where(Course.user_id == user.id).order_by(Course.id)).all()
    return _with_stats(db, user, courses)


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, user: CurrentUser, db: DbSession):
    course = Course(**payload.model_dump(), user_id=user.id)
    _commit_unique(db, course)
    return _with_stats(db, user, [course])[0]


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: int, user: CurrentUser, db: DbSession):
    return _with_stats(db, user, [get_owned_or_404(db, Course, course_id, user)])[0]


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(course_id: int, payload: CourseUpdate, user: CurrentUser, db: DbSession):
    course = get_owned_or_404(db, Course, course_id, user)
    apply_changes(course, changes_from(payload))
    _commit_unique(db, course)
    return _with_stats(db, user, [course])[0]


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, Course, course_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
