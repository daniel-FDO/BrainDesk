from collections.abc import Sequence

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.crud import apply_changes, changes_from, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import Note, Resource, StudySession, Topic, TopicDomain
from app.schemas.topic import TopicCreate, TopicRead, TopicUpdate

router = APIRouter(prefix="/topics", tags=["Topics"])


def _ensure_domain(db: Session, domain_id: str | None) -> None:
    if domain_id is not None and db.get(TopicDomain, domain_id) is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"domain '{domain_id}' does not exist"
        )


def _with_counts(db: Session, topics: Sequence[Topic]) -> list[TopicRead]:
    """One GROUP BY per linked table instead of one query per topic."""
    ids = [t.id for t in topics]
    counts: dict[str, dict[int, int]] = {}
    for key, model in (("notes_count", Note), ("resources_count", Resource), ("sessions_count", StudySession)):
        rows = db.execute(
            select(model.topic_id, func.count()).where(model.topic_id.in_(ids)).group_by(model.topic_id)
        ).all()
        counts[key] = dict(rows)
    return [
        TopicRead.model_validate(t).model_copy(
            update={key: per_topic.get(t.id, 0) for key, per_topic in counts.items()}
        )
        for t in topics
    ]


@router.get("", response_model=list[TopicRead])
def list_topics(user: CurrentUser, db: DbSession, page: Page, domain: str | None = None):
    stmt = select(Topic).where(Topic.user_id == user.id)
    if domain is not None:
        stmt = stmt.where(Topic.domain == domain)
    topics = db.scalars(stmt.order_by(Topic.id).limit(page.limit).offset(page.offset)).all()
    return _with_counts(db, topics)


@router.post("", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
def create_topic(payload: TopicCreate, user: CurrentUser, db: DbSession):
    _ensure_domain(db, payload.domain)
    topic = Topic(**payload.model_dump(), user_id=user.id)
    save(db, topic)
    return _with_counts(db, [topic])[0]


@router.get("/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: int, user: CurrentUser, db: DbSession):
    return _with_counts(db, [get_owned_or_404(db, Topic, topic_id, user)])[0]


@router.patch("/{topic_id}", response_model=TopicRead)
def update_topic(topic_id: int, payload: TopicUpdate, user: CurrentUser, db: DbSession):
    topic = get_owned_or_404(db, Topic, topic_id, user)
    changes = changes_from(payload)
    _ensure_domain(db, changes.get("domain"))
    apply_changes(topic, changes)
    save(db, topic)
    return _with_counts(db, [topic])[0]


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: int, user: CurrentUser, db: DbSession):
    """Linked notes, resources and sessions are kept; their topic_id becomes null."""
    db.delete(get_owned_or_404(db, Topic, topic_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
