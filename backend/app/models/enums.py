"""Closed value sets mirrored from frontend/src/types.ts.

Stored as VARCHAR + CHECK constraint (not native Postgres ENUMs), so adding a
value later is a plain constraint swap in a migration.
"""
from enum import StrEnum

from sqlalchemy import Enum as SAEnum


class Subject(StrEnum):
    COMPUTER_SCIENCE = "Computer Science"
    CELLULAR_BIOLOGY = "Cellular Biology"
    MATHEMATICS = "Mathematics"
    NEUROSCIENCE = "Neuroscience"


class Tone(StrEnum):
    BLUE = "blue"
    TEAL = "teal"
    VIOLET = "violet"
    SLATE = "slate"
    AMBER = "amber"


class SessionStatus(StrEnum):
    COMPLETED = "completed"
    IN_PROGRESS = "in-progress"
    UPCOMING = "upcoming"


class ResourceType(StrEnum):
    PDF = "pdf"
    VIDEO = "video"
    LINK = "link"
    SLIDES = "slides"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"


class ReviewFrequency(StrEnum):
    DAILY = "Daily"
    EVERY_2_DAYS = "Every 2 days"
    WEEKLY = "Weekly"


# Display attributes derived from a subject (frontend lib/subjects.ts and Planner SUBJECT_TAGS).
SUBJECT_TONE: dict[Subject, Tone] = {
    Subject.COMPUTER_SCIENCE: Tone.BLUE,
    Subject.CELLULAR_BIOLOGY: Tone.TEAL,
    Subject.MATHEMATICS: Tone.VIOLET,
    Subject.NEUROSCIENCE: Tone.SLATE,
}

SUBJECT_TAG: dict[Subject, str] = {
    Subject.COMPUTER_SCIENCE: "CS",
    Subject.CELLULAR_BIOLOGY: "Bio",
    Subject.MATHEMATICS: "Math",
    Subject.NEUROSCIENCE: "Neuro",
}


def enum_type(enum_cls: type[StrEnum], name: str) -> SAEnum:
    """VARCHAR(32) holding the enum's *values* (e.g. 'in-progress'), guarded by ck_<table>_<name>."""
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda members: [m.value for m in members],
        validate_strings=True,
    )
