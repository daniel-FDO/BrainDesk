from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Subject, Tone, enum_type


class TopicDomain(Base):
    """Shared reference data ('cs', 'bio', 'math'), seeded by migration 0002."""

    __tablename__ = "topic_domains"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    short_label: Mapped[str] = mapped_column(String(50), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False)
    tone: Mapped[Tone] = mapped_column(enum_type(Tone, "tone"), nullable=False)
    # Which subject the assistant quizzes on for this domain (Topics.tsx DOMAIN_SUBJECT).
    subject: Mapped[Subject] = mapped_column(enum_type(Subject, "subject"), nullable=False)
    position: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
