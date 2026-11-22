from typing import Literal

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import Select, func, select

from app.api.crud import apply_changes, changes_from, ensure_owned_reference, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import Note, Topic
from app.models.enums import Subject
from app.schemas.note import NoteCounts, NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["Notes"])


def apply_search(stmt: Select[tuple[Note]], q: str) -> Select[tuple[Note]]:
    """Narrows `stmt` to notes matching the search box ("Search in notes, tags, or concepts…").

    `q` is already trimmed and non-empty. Columns available: Note.title, Note.content,
    Note.tags (a Postgres VARCHAR[] array).
    """
    # TODO: add the WHERE clause(s) that decide what counts as a match.
    return stmt


@router.get("", response_model=list[NoteRead])
def list_notes(
    user: CurrentUser,
    db: DbSession,
    page: Page,
    q: str | None = Query(None, description="Search text (top bar / Notes search box)"),
    subject: Subject | None = None,
    favorite: bool | None = None,
    topic_id: int | None = None,
    tag: str | None = None,
    sort: Literal["updated", "created", "title"] = "updated",
):
    """Notes list; `?sort=updated&limit=3` is the Dashboard's 'Recently Edited Notes'."""
    stmt = select(Note).where(Note.user_id == user.id)
    if subject is not None:
        stmt = stmt.where(Note.subject == subject)
    if favorite is not None:
        stmt = stmt.where(Note.is_favorite == favorite)
    if topic_id is not None:
        stmt = stmt.where(Note.topic_id == topic_id)
    if tag:
        stmt = stmt.where(Note.tags.contains([tag.strip().lstrip("#").lower()]))
    if q and q.strip():
        stmt = apply_search(stmt, q.strip())

    order = {
        "updated": Note.updated_at.desc(),
        "created": Note.created_at.desc(),
        "title": Note.title.asc(),
    }[sort]
    return db.scalars(stmt.order_by(order, Note.id.desc()).limit(page.limit).offset(page.offset)).all()


@router.get("/counts", response_model=NoteCounts)
def note_counts(user: CurrentUser, db: DbSession):
    """Numbers on the Notes filter chips."""
    mine = Note.user_id == user.id
    total = db.scalar(select(func.count()).where(mine)) or 0
    favorites = db.scalar(select(func.count()).where(mine, Note.is_favorite)) or 0
    per_subject = dict(db.execute(select(Note.subject, func.count()).where(mine).group_by(Note.subject)).all())
    return NoteCounts(
        all=total,
        favorites=favorites,
        by_subject={s: per_subject.get(s, 0) for s in Subject},
    )


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate, user: CurrentUser, db: DbSession):
    ensure_owned_reference(db, Topic, payload.topic_id, user, "topic_id")
    note = Note(**payload.model_dump(), user_id=user.id)
    save(db, note)
    return note


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int, user: CurrentUser, db: DbSession):
    return get_owned_or_404(db, Note, note_id, user)


@router.patch("/{note_id}", response_model=NoteRead)
def update_note(note_id: int, payload: NoteUpdate, user: CurrentUser, db: DbSession):
    note = get_owned_or_404(db, Note, note_id, user)
    changes = changes_from(payload)
    ensure_owned_reference(db, Topic, changes.get("topic_id"), user, "topic_id")
    apply_changes(note, changes)
    save(db, note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, Note, note_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
