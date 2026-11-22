from datetime import date

from fastapi import APIRouter, Response, status
from sqlalchemy import func, select

from app.api.crud import apply_changes, changes_from, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import AgendaTask
from app.schemas.agenda_task import AgendaTaskCreate, AgendaTaskRead, AgendaTaskUpdate

router = APIRouter(prefix="/agenda-tasks", tags=["Agenda"])


@router.get("", response_model=list[AgendaTaskRead])
def list_agenda_tasks(user: CurrentUser, db: DbSession, page: Page, due_date: date | None = None):
    """Today's Agenda: pass `due_date` (the client's local date); omitted lists every task."""
    stmt = select(AgendaTask).where(AgendaTask.user_id == user.id)
    if due_date is not None:
        stmt = stmt.where(AgendaTask.due_date == due_date)
    stmt = stmt.order_by(AgendaTask.due_date, AgendaTask.id)
    return db.scalars(stmt.limit(page.limit).offset(page.offset)).all()


@router.post("", response_model=AgendaTaskRead, status_code=status.HTTP_201_CREATED)
def create_agenda_task(payload: AgendaTaskCreate, user: CurrentUser, db: DbSession):
    data = payload.model_dump(exclude_none=True)  # no due_date -> DB default (today)
    task = AgendaTask(**data, user_id=user.id)
    save(db, task)
    return task


@router.get("/{task_id}", response_model=AgendaTaskRead)
def get_agenda_task(task_id: int, user: CurrentUser, db: DbSession):
    return get_owned_or_404(db, AgendaTask, task_id, user)


@router.patch("/{task_id}", response_model=AgendaTaskRead)
def update_agenda_task(task_id: int, payload: AgendaTaskUpdate, user: CurrentUser, db: DbSession):
    task = get_owned_or_404(db, AgendaTask, task_id, user)
    changes = changes_from(payload)
    if "is_done" in changes and changes["is_done"] != task.is_done:
        changes["completed_at"] = func.now() if changes["is_done"] else None
    apply_changes(task, changes)
    save(db, task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agenda_task(task_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, AgendaTask, task_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
