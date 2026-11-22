from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ChatRole, enum_type
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.note import Note

# The notes an assistant answer drew on (ChatMessage.sources chips).
chat_message_sources = Table(
    "chat_message_sources",
    Base.metadata,
    Column("message_id", ForeignKey("chat_messages.id", ondelete="CASCADE"), primary_key=True),
    Column("note_id", ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class ChatMessage(CreatedAtMixin, Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[ChatRole] = mapped_column(enum_type(ChatRole, "role"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sources: Mapped[list["Note"]] = relationship(secondary=chat_message_sources, order_by="Note.id")
