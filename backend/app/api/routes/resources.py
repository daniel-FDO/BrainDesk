from urllib.parse import urlparse

from fastapi import APIRouter, Response, status
from sqlalchemy import String, cast, or_, select

from app.api.crud import apply_changes, changes_from, ensure_owned_reference, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import Resource, Topic
from app.models.enums import ResourceType, Subject
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate

router = APIRouter(prefix="/resources", tags=["Resources"])


def _default_source(url: str | None) -> str:
    """Mirrors the Add resource form: the link's hostname, or 'Added by you' for uploads."""
    if url:
        host = urlparse(url).hostname or ""
        return host.removeprefix("www.") or "Added by you"
    return "Added by you"


@router.get("", response_model=list[ResourceRead])
def list_resources(
    user: CurrentUser,
    db: DbSession,
    page: Page,
    q: str | None = None,
    type: ResourceType | None = None,
    subject: Subject | None = None,
    pinned: bool | None = None,
    topic_id: int | None = None,
):
    stmt = select(Resource).where(Resource.user_id == user.id)
    if type is not None:
        stmt = stmt.where(Resource.type == type)
    if subject is not None:
        stmt = stmt.where(Resource.subject == subject)
    if pinned is not None:
        stmt = stmt.where(Resource.is_pinned == pinned)
    if topic_id is not None:
        stmt = stmt.where(Resource.topic_id == topic_id)
    if q and q.strip():
        # "Search by title, source or subject..."
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Resource.title.ilike(like), Resource.source.ilike(like), cast(Resource.subject, String).ilike(like)))
    stmt = stmt.order_by(Resource.is_pinned.desc(), Resource.created_at.desc(), Resource.id.desc())
    return db.scalars(stmt.limit(page.limit).offset(page.offset)).all()


@router.post("", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
def create_resource(payload: ResourceCreate, user: CurrentUser, db: DbSession):
    ensure_owned_reference(db, Topic, payload.topic_id, user, "topic_id")
    data = payload.model_dump()
    data["source"] = data["source"] or _default_source(data["url"])
    resource = Resource(**data, user_id=user.id)
    save(db, resource)
    return resource


@router.get("/{resource_id}", response_model=ResourceRead)
def get_resource(resource_id: int, user: CurrentUser, db: DbSession):
    return get_owned_or_404(db, Resource, resource_id, user)


@router.patch("/{resource_id}", response_model=ResourceRead)
def update_resource(resource_id: int, payload: ResourceUpdate, user: CurrentUser, db: DbSession):
    resource = get_owned_or_404(db, Resource, resource_id, user)
    changes = changes_from(payload)
    ensure_owned_reference(db, Topic, changes.get("topic_id"), user, "topic_id")
    apply_changes(resource, changes)
    save(db, resource)
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, Resource, resource_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
