from pydantic import BaseModel, ConfigDict


class InputModel(BaseModel):
    """Request bodies: surrounding whitespace is trimmed before length checks; unknown fields are rejected."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ORMModel(BaseModel):
    """Response bodies, built straight from SQLAlchemy objects."""

    model_config = ConfigDict(from_attributes=True)


class NoteRef(ORMModel):
    """{id, title} pair used for assistant source chips."""

    id: int
    title: str
