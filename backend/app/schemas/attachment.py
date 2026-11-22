from datetime import datetime

from pydantic import computed_field

from app.schemas.common import ORMModel


class AttachmentRead(ORMModel):
    id: int
    file_name: str
    content_type: str
    size_bytes: int
    study_session_id: int | None
    created_at: datetime

    @computed_field
    @property
    def download_url(self) -> str:
        return f"/attachments/{self.id}/download"
