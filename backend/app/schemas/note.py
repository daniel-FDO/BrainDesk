import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, computed_field

from app.models.enums import Subject
from app.schemas.common import InputModel, ORMModel

MAX_TAGS = 20
MAX_TAG_LENGTH = 50
EXCERPT_LENGTH = 160


def normalize_tags(tags: list[str]) -> list[str]:
    """Same rules as the Notes tag input: drop leading '#', lowercase, spaces -> '-', no duplicates."""
    cleaned: list[str] = []
    for raw in tags:
        tag = re.sub(r"\s+", "-", raw.strip().lstrip("#").lower())
        if tag and tag not in cleaned:
            cleaned.append(tag[:MAX_TAG_LENGTH])
    if len(cleaned) > MAX_TAGS:
        raise ValueError(f"A note can have at most {MAX_TAGS} tags")
    return cleaned


Tags = Annotated[list[str], AfterValidator(normalize_tags)]


class NoteCreate(InputModel):
    title: str = Field("Untitled note", min_length=1, max_length=150)
    subject: Subject = Subject.COMPUTER_SCIENCE
    content: str = ""
    tags: Tags = []
    is_favorite: bool = False
    topic_id: int | None = None
    icon: str | None = Field(None, max_length=50)
    kind: str | None = Field(None, max_length=80)


class NoteUpdate(InputModel):
    title: str | None = Field(None, min_length=1, max_length=150)
    subject: Subject | None = None
    content: str | None = None
    tags: Tags | None = None
    is_favorite: bool | None = None
    topic_id: int | None = None
    icon: str | None = Field(None, max_length=50)
    kind: str | None = Field(None, max_length=80)


class NoteRead(ORMModel):
    id: int
    title: str
    subject: Subject
    content: str
    tags: list[str]
    is_favorite: bool
    topic_id: int | None
    icon: str | None
    kind: str | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def excerpt(self) -> str:
        flat = " ".join(self.content.split())
        return flat if len(flat) <= EXCERPT_LENGTH else flat[: EXCERPT_LENGTH - 1].rstrip() + "…"

    @computed_field
    @property
    def word_count(self) -> int:
        return len(self.content.split())


class NoteCounts(BaseModel):
    """Notes filter chips: All, Favorites and one per subject."""

    all: int
    favorites: int
    by_subject: dict[Subject, int]
