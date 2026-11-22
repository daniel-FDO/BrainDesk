from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Subject, Tone, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin


class Course(OwnedMixin, TimestampMixin, Base):
    """Dashboard course cards. Note/resource counts and the next session are derived via `subject`."""

    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("user_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    summary: Mapped[str] = mapped_column(String(255), default="", server_default="", nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="school", server_default="school", nullable=False)
    tone: Mapped[Tone] = mapped_column(enum_type(Tone, "tone"), nullable=False)
    subject: Mapped[Subject] = mapped_column(enum_type(Subject, "subject"), nullable=False)
