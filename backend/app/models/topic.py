from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ReviewFrequency, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin


class Topic(OwnedMixin, TimestampMixin, Base):
    """A topic card plus its detail panel (frontend Topic + topicDetails)."""

    __tablename__ = "topics"
    __table_args__ = (
        CheckConstraint("progress BETWEEN 0 AND 100", name="progress_range"),
        CheckConstraint("coverage BETWEEN 0 AND 100", name="coverage_range"),
        CheckConstraint("quiz_score IS NULL OR quiz_score BETWEEN 0 AND 100", name="quiz_score_range"),
        CheckConstraint("embeddings >= 0", name="embeddings_non_negative"),
        CheckConstraint("study_hours >= 0", name="study_hours_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    domain: Mapped[str] = mapped_column(
        ForeignKey("topic_domains.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", server_default="", nullable=False)

    # Card chrome
    badge: Mapped[str | None] = mapped_column(String(50))
    meta: Mapped[str | None] = mapped_column(String(80))
    meta_emphasis: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    progress: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    footnote: Mapped[str | None] = mapped_column(String(120))

    # Detail panel
    review_frequency: Mapped[ReviewFrequency] = mapped_column(
        enum_type(ReviewFrequency, "review_frequency"),
        default=ReviewFrequency.DAILY,
        server_default=ReviewFrequency.DAILY.value,
        nullable=False,
    )
    study_hours: Mapped[Decimal] = mapped_column(
        Numeric(6, 1), default=Decimal("0"), server_default="0", nullable=False
    )
    quiz_score: Mapped[int | None] = mapped_column()
    coverage: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    embeddings: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
