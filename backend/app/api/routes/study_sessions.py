from datetime import datetime, timezone

from fastapi import APIRouter, Query, Response, status
from pydantic import AwareDatetime
from sqlalchemy import select

from app.api.crud import apply_changes, changes_from, ensure_owned_reference, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import StudySession, Topic
from app.models.enums import SessionStatus, Subject
from app.schemas.study_session import StudySessionCreate, StudySessionRead, StudySessionUpdate

router = APIRouter(prefix="/study-sessions", tags=["Study sessions"])


def _not_done():
    return StudySession.status != SessionStatus.COMPLETED


@router.get("", response_model=list[StudySessionRead])
def list_study_sessions(
    user: CurrentUser,
    db: DbSession,
    page: Page,
    starts_from: AwareDatetime | None = None,
    starts_before: AwareDatetime | None = None,
    status_: SessionStatus | None = Query(None, alias="status"),
    subject: Subject | None = None,
    topic_id: int | None = None,
    upcoming: bool = False,
):
    """Planner week view: pass the week's bounds as `starts_from` / `starts_before`.

    `upcoming=true` gives the Dashboard / notifications list (not completed, not yet started).
    """
    stmt = select(StudySession).where(StudySession.user_id == user.id)
    if starts_from is not None:
        stmt = stmt.where(StudySession.starts_at >= starts_from)
    if starts_before is not None:
        stmt = stmt.where(StudySession.starts_at < starts_before)
    if status_ is not None:
        stmt = stmt.where(StudySession.status == status_)
    if subject is not None:
        stmt = stmt.where(StudySession.subject == subject)
    if topic_id is not None:
        stmt = stmt.where(StudySession.topic_id == topic_id)
    if upcoming:
        stmt = stmt.where(_not_done(), StudySession.starts_at >= datetime.now(timezone.utc))
    stmt = stmt.order_by(StudySession.starts_at, StudySession.id)
    return db.scalars(stmt.limit(page.limit).offset(page.offset)).all()


@router.get("/next", response_model=StudySessionRead | None)
def next_study_session(user: CurrentUser, db: DbSession):
    """The session flagged `isNext` on the Dashboard; null when nothing is scheduled."""
    return db.scalar(
        select(StudySession)
        .where(
            StudySession.user_id == user.id,
            _not_done(),
            StudySession.starts_at >= datetime.now(timezone.utc),
        )
        .order_by(StudySession.starts_at, StudySession.id)
        .limit(1)
    )


@router.post("", response_model=StudySessionRead, status_code=status.HTTP_201_CREATED)
def create_study_session(payload: StudySessionCreate, user: CurrentUser, db: DbSession):
    ensure_owned_reference(db, Topic, payload.topic_id, user, "topic_id")
    session = StudySession(**payload.model_dump(), user_id=user.id)
    save(db, session)
    return session


@router.get("/{session_id}", response_model=StudySessionRead)
def get_study_session(session_id: int, user: CurrentUser, db: DbSession):
    return get_owned_or_404(db, StudySession, session_id, user)


@router.patch("/{session_id}", response_model=StudySessionRead)
def update_study_session(session_id: int, payload: StudySessionUpdate, user: CurrentUser, db: DbSession):
    """Covers 'Mark complete' (status), the reminder bell (reminder) and rescheduling."""
    session = get_owned_or_404(db, StudySession, session_id, user)
    changes = changes_from(payload)
    ensure_owned_reference(db, Topic, changes.get("topic_id"), user, "topic_id")
    apply_changes(session, changes)
    save(db, session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_session(session_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, StudySession, session_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
