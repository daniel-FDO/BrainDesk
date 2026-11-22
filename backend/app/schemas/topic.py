from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field

from app.models.enums import ReviewFrequency
from app.schemas.common import InputModel, ORMModel

Percent = Annotated[int, Field(ge=0, le=100)]
Hours = Annotated[Decimal, Field(ge=0, max_digits=6, decimal_places=1)]


class TopicCreate(InputModel):
    domain: str = Field(min_length=1, max_length=20)
    title: str = Field(min_length=1, max_length=150)
    summary: str = Field("", max_length=5000)
    badge: str | None = Field(None, max_length=50)
    meta: str | None = Field(None, max_length=80)
    meta_emphasis: bool = False
    progress: Percent = 0
    footnote: str | None = Field(None, max_length=120)
    review_frequency: ReviewFrequency = ReviewFrequency.DAILY
    study_hours: Hours = Decimal("0")
    quiz_score: Percent | None = None
    coverage: Percent = 0
    embeddings: Annotated[int, Field(ge=0)] = 0


class TopicUpdate(InputModel):
    domain: str | None = Field(None, min_length=1, max_length=20)
    title: str | None = Field(None, min_length=1, max_length=150)
    summary: str | None = Field(None, max_length=5000)
    badge: str | None = Field(None, max_length=50)
    meta: str | None = Field(None, max_length=80)
    meta_emphasis: bool | None = None
    progress: Percent | None = None
    footnote: str | None = Field(None, max_length=120)
    review_frequency: ReviewFrequency | None = None
    study_hours: Hours | None = None
    quiz_score: Percent | None = None
    coverage: Percent | None = None
    embeddings: Annotated[int, Field(ge=0)] | None = None


class TopicRead(ORMModel):
    id: int
    domain: str
    title: str
    summary: str
    badge: str | None
    meta: str | None
    meta_emphasis: bool
    progress: int
    footnote: str | None
    review_frequency: ReviewFrequency
    study_hours: Decimal
    quiz_score: int | None
    coverage: int
    embeddings: int
    created_at: datetime
    updated_at: datetime
    # Derived: how many notes / resources / sessions link to this topic.
    notes_count: int = 0
    resources_count: int = 0
    sessions_count: int = 0
