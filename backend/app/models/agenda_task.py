from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import OwnedMixin, TimestampMixin


class AgendaTask(OwnedMixin, TimestampMixin, Base):
    """Planner 'Today's Agenda' checklist items."""

    __tablename__ = "agenda_tasks"
    __table_args__ = (Index("ix_agenda_tasks_user_id_due_date", "user_id", "due_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(255))
    is_done: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    due_date: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
