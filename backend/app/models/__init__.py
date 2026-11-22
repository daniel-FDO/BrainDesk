"""Importing this package registers every table on Base.metadata (Alembic relies on it)."""
from app.models.agenda_task import AgendaTask
from app.models.attachment import Attachment
from app.models.chat_message import ChatMessage, chat_message_sources
from app.models.conversation import Conversation
from app.models.course import Course
from app.models.focus_settings import FocusSettings
from app.models.note import Note
from app.models.resource import Resource
from app.models.study_session import StudySession
from app.models.topic import Topic
from app.models.topic_domain import TopicDomain
from app.models.user import User

__all__ = [
    "AgendaTask",
    "Attachment",
    "ChatMessage",
    "Conversation",
    "Course",
    "FocusSettings",
    "Note",
    "Resource",
    "StudySession",
    "Topic",
    "TopicDomain",
    "User",
    "chat_message_sources",
]
