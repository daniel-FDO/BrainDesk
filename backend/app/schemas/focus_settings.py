from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.models.focus_settings import MAX_TIMER_MINUTES, MIN_TIMER_MINUTES
from app.schemas.common import InputModel, ORMModel

TimerMinutes = Annotated[int, Field(ge=MIN_TIMER_MINUTES, le=MAX_TIMER_MINUTES)]


class FocusSettingsUpdate(InputModel):
    """Full replacement of all three lengths, as the Settings form saves them together."""

    pomodoro_minutes: TimerMinutes
    short_break_minutes: TimerMinutes
    deep_work_minutes: TimerMinutes


class FocusSettingsRead(ORMModel):
    pomodoro_minutes: int
    short_break_minutes: int
    deep_work_minutes: int
    updated_at: datetime
