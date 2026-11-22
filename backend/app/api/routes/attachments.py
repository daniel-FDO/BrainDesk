from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api.crud import ensure_owned_reference, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.core.config import settings
from app.models import Attachment, StudySession
from app.schemas.attachment import AttachmentRead

router = APIRouter(prefix="/attachments", tags=["Attachments"])

CHUNK_BYTES = 1024 * 1024


def _path_for(attachment: Attachment) -> Path:
    return settings.upload_dir / attachment.storage_key


def _store(upload: UploadFile, destination: Path) -> int:
    """Streams the upload to disk, enforcing the size limit without reading it all into memory."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    with destination.open("wb") as out:
        while chunk := upload.file.read(CHUNK_BYTES):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"Files can be at most {settings.max_upload_bytes // (1024 * 1024)} MB",
                )
            out.write(chunk)
    return size


@router.get("", response_model=list[AttachmentRead])
def list_attachments(user: CurrentUser, db: DbSession, page: Page, study_session_id: int | None = None):
    stmt = select(Attachment).where(Attachment.user_id == user.id)
    if study_session_id is not None:
        stmt = stmt.where(Attachment.study_session_id == study_session_id)
    stmt = stmt.order_by(Attachment.created_at.desc(), Attachment.id.desc())
    return db.scalars(stmt.limit(page.limit).offset(page.offset)).all()


@router.post("", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    study_session_id: Annotated[int | None, Form()] = None,
):
    ensure_owned_reference(db, StudySession, study_session_id, user, "study_session_id")
    storage_key = uuid4().hex
    destination = settings.upload_dir / storage_key
    size = _store(file, destination)

    attachment = Attachment(
        user_id=user.id,
        study_session_id=study_session_id,
        file_name=Path(file.filename or "upload").name[:255],
        content_type=(file.content_type or "application/octet-stream")[:100],
        size_bytes=size,
        storage_key=storage_key,
    )
    try:
        save(db, attachment)
    except Exception:
        destination.unlink(missing_ok=True)  # don't leave orphaned bytes behind
        raise
    return attachment


@router.get("/{attachment_id}", response_model=AttachmentRead)
def get_attachment(attachment_id: int, user: CurrentUser, db: DbSession):
    return get_owned_or_404(db, Attachment, attachment_id, user)


@router.get("/{attachment_id}/download", response_class=FileResponse)
def download_attachment(attachment_id: int, user: CurrentUser, db: DbSession):
    attachment = get_owned_or_404(db, Attachment, attachment_id, user)
    path = _path_for(attachment)
    if not path.is_file():
        raise HTTPException(status.HTTP_410_GONE, detail="The file is no longer stored")
    return FileResponse(path, media_type=attachment.content_type, filename=attachment.file_name)


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(attachment_id: int, user: CurrentUser, db: DbSession):
    attachment = get_owned_or_404(db, Attachment, attachment_id, user)
    path = _path_for(attachment)
    db.delete(attachment)
    db.commit()
    path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
