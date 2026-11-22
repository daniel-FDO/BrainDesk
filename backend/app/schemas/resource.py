from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, Field, HttpUrl, TypeAdapter

from app.models.enums import ResourceType, Subject
from app.schemas.common import InputModel, ORMModel

_http_url = TypeAdapter(HttpUrl)


def _validate_http_url(value: str) -> str:
    return str(_http_url.validate_python(value))


# A plain string that must parse as an http(s) URL; stored normalised (e.g. trailing slash added).
WebUrl = Annotated[str, Field(max_length=2048), AfterValidator(_validate_http_url)]


class ResourceCreate(InputModel):
    title: str = Field(min_length=1, max_length=200)
    type: ResourceType = ResourceType.LINK
    subject: Subject
    # Omitted -> the URL's hostname, or "Added by you" (same rule as the Add resource form).
    source: str | None = Field(None, min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=100)
    url: WebUrl | None = None
    is_pinned: bool = False
    topic_id: int | None = None


class ResourceUpdate(InputModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    type: ResourceType | None = None
    subject: Subject | None = None
    source: str | None = Field(None, min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=100)
    url: WebUrl | None = None
    is_pinned: bool | None = None
    topic_id: int | None = None


class ResourceRead(ORMModel):
    id: int
    title: str
    type: ResourceType
    subject: Subject
    source: str
    detail: str | None
    url: str | None
    is_pinned: bool
    topic_id: int | None
    created_at: datetime
    updated_at: datetime
