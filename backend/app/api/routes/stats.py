from datetime import date, datetime, time, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import Date, cast, func, select

from app.api.deps import CurrentUser, DbSession
from app.models import StudySession
from app.models.enums import SessionStatus
from app.schemas.study_session import DailyHours

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/weekly-hours", response_model=list[DailyHours])
def weekly_hours(
    user: CurrentUser,
    db: DbSession,
    week_start: date | None = Query(None, description="Monday of the week; defaults to this week"),
    tz: Annotated[str, Query(description="IANA zone used to bucket sessions into days")] = "UTC",
):
    """Planner chart: hours of *completed* study sessions per day, Monday to Sunday."""
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Unknown time zone '{tz}'")

    if week_start is None:
        today = datetime.now(zone).date()
        week_start = today - timedelta(days=today.weekday())
    start = datetime.combine(week_start, time.min, tzinfo=zone)
    end = start + timedelta(days=7)

    local_day = cast(func.timezone(tz, StudySession.starts_at), Date)
    rows = db.execute(
        select(local_day, func.sum(StudySession.duration_minutes))
        .where(
            StudySession.user_id == user.id,
            StudySession.status == SessionStatus.COMPLETED,
            StudySession.starts_at >= start,
            StudySession.starts_at < end,
        )
        .group_by(local_day)
    ).all()
    minutes_by_day = dict(rows)

    days = (week_start + timedelta(days=i) for i in range(7))
    return [DailyHours(date=d, hours=round((minutes_by_day.get(d) or 0) / 60, 1)) for d in days]
