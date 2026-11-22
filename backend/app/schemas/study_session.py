from datetime import date, datetime, timedelta
from typing import Annotated

from pydantic import AwareDatetime, BaseModel, Field, computed_field

from app.models.enums import SUBJECT_TAG, SUBJECT_TONE, SessionStatus, Subject, Tone
from app.models.study_session import MAX_SESSION_MINUTES
from app.schemas.common import InputModel, ORMModel

Minutes = Annotated[int, Field(ge=1, le=MAX_SESSION_MINUTES)]


class StudySessionCreate(InputModel):
    title: str = Field(min_length=1, max_length=150)
    subject: Subject
    starts_at: AwareDatetime  # must carry a UTC offset, so "4:00 PM" is unambiguous
    duration_minutes: Minutes
    goal: str | None = Field(None, max_length=255)
    detail: str | None = None
    status: SessionStatus = SessionStatus.UPCOMING
    reminder: bool = False
    topic_id: int | None = None


class StudySessionUpdate(InputModel):
    title: str | None = Field(None, min_length=1, max_length=150)
    subject: Subject | None = None
    starts_at: AwareDatetime | None = None
    duration_minutes: Minutes | None = None
    goal: str | None = Field(None, max_length=255)
    detail: str | None = None
    status: SessionStatus | None = None
    reminder: bool | None = None
    topic_id: int | None = None


class StudySessionRead(ORMModel):
    id: int
    title: str
    subject: Subject
    starts_at: datetime
    duration_minutes: int
    goal: str | None
    detail: str | None
    status: SessionStatus
    reminder: bool
    topic_id: int | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def ends_at(self) -> datetime:
        return self.starts_at + timedelta(minutes=self.duration_minutes)

    @computed_field
    @property
    def tag(self) -> str:
        return SUBJECT_TAG[self.subject]

    @computed_field
    @property
    def tone(self) -> Tone:
        return SUBJECT_TONE[self.subject]


class DailyHours(BaseModel):
    """One bar of the Planner's weekly hours chart."""

    date: date
    hours: float

    @computed_field
    @property
    def label(self) -> str:
        return "MTWTFSS"[self.date.weekday()]
