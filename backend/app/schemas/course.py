from datetime import datetime

from pydantic import Field

from app.models.enums import Subject, Tone
from app.schemas.common import InputModel, ORMModel


class CourseCreate(InputModel):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=30)
    summary: str = Field("", max_length=255)
    icon: str = Field("school", min_length=1, max_length=50)
    tone: Tone
    subject: Subject


class CourseUpdate(InputModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    code: str | None = Field(None, min_length=1, max_length=30)
    summary: str | None = Field(None, max_length=255)
    icon: str | None = Field(None, min_length=1, max_length=50)
    tone: Tone | None = None
    subject: Subject | None = None


class NextSession(ORMModel):
    id: int
    title: str
    starts_at: datetime


class CourseRead(ORMModel):
    id: int
    name: str
    code: str
    summary: str
    icon: str
    tone: Tone
    subject: Subject
    created_at: datetime
    updated_at: datetime
    # Derived from notes/resources/study sessions with the same subject.
    notes_count: int = 0
    resources_count: int = 0
    next_session: NextSession | None = None
