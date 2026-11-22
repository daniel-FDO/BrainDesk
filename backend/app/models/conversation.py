from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Subject, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage


class Conversation(OwnedMixin, TimestampMixin, Base):
    """An Assistant chat thread. `subject` is the scope picker; NULL means 'all notes'."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None] = mapped_column(String(200))
    subject: Mapped[Subject | None] = mapped_column(enum_type(Subject, "subject"))

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation",
        order_by="ChatMessage.id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
