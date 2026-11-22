from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Subject, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin


class Note(OwnedMixin, TimestampMixin, Base):
    """Notes page, dashboard 'recently edited' and topic notes (Note / RecentNote / TopicNote)."""

    __tablename__ = "notes"
    __table_args__ = (
        Index("ix_notes_user_id_updated_at", "user_id", "updated_at"),
        Index("ix_notes_tags", "tags", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL"), index=True
    )
    subject: Mapped[Subject] = mapped_column(
        enum_type(Subject, "subject"),
        default=Subject.COMPUTER_SCIENCE,
        server_default=Subject.COMPUTER_SCIENCE.value,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", server_default="", nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), default=list, server_default="{}", nullable=False
    )
    is_favorite: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    # Shown on topic note rows: an icon name and a kind such as "Lecture 09".
    icon: Mapped[str | None] = mapped_column(String(50))
    kind: Mapped[str | None] = mapped_column(String(80))
