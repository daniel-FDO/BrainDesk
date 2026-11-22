from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.api.crud import apply_changes, changes_from, save
from app.api.deps import CurrentUser, DbSession
from app.models import FocusSettings, User
from app.schemas.focus_settings import FocusSettingsRead, FocusSettingsUpdate
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users/me", tags=["Profile & settings"])


@router.get("", response_model=UserRead)
def read_me(user: CurrentUser):
    return user


@router.patch("", response_model=UserRead)
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession):
    apply_changes(user, changes_from(payload))
    save(db, user)
    return user


def _focus_settings(db: Session, user: User) -> FocusSettings:
    """Accounts created before focus settings existed get the defaults on first access."""
    settings = db.get(FocusSettings, user.id)
    if settings is None:
        settings = FocusSettings(user_id=user.id)
        save(db, settings)
    return settings


@router.get("/focus-settings", response_model=FocusSettingsRead)
def read_focus_settings(user: CurrentUser, db: DbSession):
    return _focus_settings(db, user)


@router.put("/focus-settings", response_model=FocusSettingsRead)
def replace_focus_settings(payload: FocusSettingsUpdate, user: CurrentUser, db: DbSession):
    settings = _focus_settings(db, user)
    apply_changes(settings, payload.model_dump())
    save(db, settings)
    return settings
