from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# Same bounds as frontend lib/focusModes.ts (MIN_TIMER_MINUTES / MAX_TIMER_MINUTES).
MIN_TIMER_MINUTES = 1
MAX_TIMER_MINUTES = 180


def _range_check(column: str) -> CheckConstraint:
    return CheckConstraint(
        f"{column} BETWEEN {MIN_TIMER_MINUTES} AND {MAX_TIMER_MINUTES}", name=f"{column}_range"
    )


class FocusSettings(Base):
    """Focus-timer lengths per mode, one row per user (Settings page + sidebar timer)."""

    __tablename__ = "focus_settings"
    __table_args__ = (
        _range_check("pomodoro_minutes"),
        _range_check("short_break_minutes"),
        _range_check("deep_work_minutes"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    pomodoro_minutes: Mapped[int] = mapped_column(default=25, server_default="25", nullable=False)
    short_break_minutes: Mapped[int] = mapped_column(default=5, server_default="5", nullable=False)
    deep_work_minutes: Mapped[int] = mapped_column(default=50, server_default="50", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
