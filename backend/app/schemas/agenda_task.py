from datetime import date, datetime

from pydantic import Field

from app.schemas.common import InputModel, ORMModel


class AgendaTaskCreate(InputModel):
    title: str = Field(min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=255)
    due_date: date | None = None  # omitted -> today (database CURRENT_DATE)


class AgendaTaskUpdate(InputModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=255)
    is_done: bool | None = None
    due_date: date | None = None


class AgendaTaskRead(ORMModel):
    id: int
    title: str
    detail: str | None
    is_done: bool
    due_date: date
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
