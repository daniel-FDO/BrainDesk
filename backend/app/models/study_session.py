from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import SessionStatus, Subject, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin

MAX_SESSION_MINUTES = 480  # Planner's "Length must be 1–480 minutes."


class StudySession(OwnedMixin, TimestampMixin, Base):
    """One scheduled study block.

    Backs both the Dashboard's StudySession and the Planner's LearningBlock: tag, tone,
    day/week and isNext are all derived from `subject` and `starts_at`.
    """

    __tablename__ = "study_sessions"
    __table_args__ = (
        CheckConstraint(
            f"duration_minutes BETWEEN 1 AND {MAX_SESSION_MINUTES}", name="duration_minutes_range"
        ),
        Index("ix_study_sessions_user_id_starts_at", "user_id", "starts_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    subject: Mapped[Subject] = mapped_column(enum_type(Subject, "subject"), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(nullable=False)
    goal: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[SessionStatus] = mapped_column(
        enum_type(SessionStatus, "status"),
        default=SessionStatus.UPCOMING,
        server_default=SessionStatus.UPCOMING.value,
        nullable=False,
    )
    reminder: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
