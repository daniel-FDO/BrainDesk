from datetime import datetime

from pydantic import Field

from app.models.enums import ChatRole, Subject
from app.schemas.common import InputModel, NoteRef, ORMModel


class ConversationCreate(InputModel):
    title: str | None = Field(None, max_length=200)
    subject: Subject | None = None  # None = all notes in scope


class ConversationUpdate(InputModel):
    title: str | None = Field(None, max_length=200)
    subject: Subject | None = None


class ChatMessageCreate(InputModel):
    role: ChatRole
    text: str = Field(min_length=1)
    source_note_ids: list[int] = Field(default_factory=list, max_length=20)


class ChatMessageRead(ORMModel):
    id: int
    role: ChatRole
    text: str
    sources: list[NoteRef]
    created_at: datetime


class ConversationRead(ORMModel):
    id: int
    title: str | None
    subject: Subject | None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationRead):
    messages: list[ChatMessageRead]
