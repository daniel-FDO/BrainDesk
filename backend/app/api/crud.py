"""Small helpers shared by every router: ownership checks and PATCH application."""
from typing import Any, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models import User

ModelT = TypeVar("ModelT", bound=Base)


def get_owned_or_404(db: Session, model: type[ModelT], obj_id: int, user: User) -> ModelT:
    """Someone else's row is reported as missing, so ids can't be probed."""
    obj = db.get(model, obj_id)
    if obj is None or getattr(obj, "user_id", None) != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"{model.__name__} not found")
    return obj


def ensure_owned_reference(
    db: Session, model: type[Base], obj_id: int | None, user: User, field: str
) -> None:
    """Validates a foreign key in a request body (e.g. topic_id) before it hits the database."""
    if obj_id is None:
        return
    obj = db.get(model, obj_id)
    if obj is None or getattr(obj, "user_id", None) != user.id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{field} {obj_id} does not exist"
        )


def changes_from(payload: BaseModel) -> dict[str, Any]:
    """Only the fields the client actually sent, so omitted fields stay untouched."""
    return payload.model_dump(exclude_unset=True)


def apply_changes(obj: Base, changes: dict[str, Any]) -> None:
    """PATCH semantics: explicit null is allowed only for nullable columns."""
    columns = inspect(type(obj)).columns
    for field, value in changes.items():
        if value is None and field in columns and not columns[field].nullable:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{field} cannot be null"
            )
        setattr(obj, field, value)


def save(db: Session, obj: Base) -> None:
    db.add(obj)
    db.commit()
    db.refresh(obj)
