from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, OwnedMixin


class Attachment(OwnedMixin, CreatedAtMixin, Base):
    """Files uploaded on the Planner's 'Attached Resources' panel. Bytes live on disk under `storage_key`."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    study_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
