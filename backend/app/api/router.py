from fastapi import APIRouter

from app.api.routes import (
    agenda_tasks,
    attachments,
    auth,
    conversations,
    courses,
    notes,
    resources,
    stats,
    study_sessions,
    topic_domains,
    topics,
    users,
)

api_router = APIRouter()

for module in (
    auth,
    users,
    courses,
    topic_domains,
    topics,
    notes,
    resources,
    study_sessions,
    agenda_tasks,
    attachments,
    conversations,
    stats,
):
    api_router.include_router(module.router)
