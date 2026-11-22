from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ResourceType, Subject, enum_type
from app.models.mixins import OwnedMixin, TimestampMixin


class Resource(OwnedMixin, TimestampMixin, Base):
    """Resources page entries: papers, videos, links and slides."""

    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[ResourceType] = mapped_column(enum_type(ResourceType, "type"), nullable=False)
    subject: Mapped[Subject] = mapped_column(enum_type(Subject, "subject"), nullable=False)
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(100))
    url: Mapped[str | None] = mapped_column(String(2048))
    is_pinned: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
