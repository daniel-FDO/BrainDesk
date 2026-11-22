from datetime import datetime

from pydantic import EmailStr, Field, computed_field

from app.schemas.common import InputModel, ORMModel


class UserCreate(InputModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    track: str = Field("", max_length=100)


class UserUpdate(InputModel):
    """Settings > Profile. Name can't be empty; track can."""

    name: str | None = Field(None, min_length=1, max_length=100)
    track: str | None = Field(None, max_length=100)


class UserRead(ORMModel):
    id: int
    email: EmailStr
    name: str
    track: str
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def first_name(self) -> str:
        return self.name.split()[0] if self.name.strip() else ""

    @computed_field
    @property
    def initials(self) -> str:
        return "".join(part[0] for part in self.name.split()[:2]).upper()
