from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.crud import apply_changes, changes_from, get_owned_or_404, save
from app.api.deps import CurrentUser, DbSession, Page
from app.models import ChatMessage, Conversation, Note
from app.models.enums import ChatRole
from app.schemas.conversation import (
    ChatMessageCreate,
    ChatMessageRead,
    ConversationCreate,
    ConversationDetail,
    ConversationRead,
    ConversationUpdate,
)

router = APIRouter(prefix="/conversations", tags=["Assistant"])

TITLE_FROM_PROMPT_CHARS = 60


@router.get("", response_model=list[ConversationRead])
def list_conversations(user: CurrentUser, db: DbSession, page: Page):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
    )
    return db.scalars(stmt.limit(page.limit).offset(page.offset)).all()


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, user: CurrentUser, db: DbSession):
    conversation = Conversation(**payload.model_dump(), user_id=user.id)
    save(db, conversation)
    return conversation


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, user: CurrentUser, db: DbSession):
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages).selectinload(ChatMessage.sources))
    )
    if conversation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.patch("/{conversation_id}", response_model=ConversationRead)
def update_conversation(conversation_id: int, payload: ConversationUpdate, user: CurrentUser, db: DbSession):
    conversation = get_owned_or_404(db, Conversation, conversation_id, user)
    apply_changes(conversation, changes_from(payload))
    save(db, conversation)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned_or_404(db, Conversation, conversation_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{conversation_id}/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED
)
def add_message(conversation_id: int, payload: ChatMessageCreate, user: CurrentUser, db: DbSession):
    """Stores one chat turn. Generating the assistant's reply is not part of this API yet."""
    conversation = get_owned_or_404(db, Conversation, conversation_id, user)

    wanted = set(payload.source_note_ids)
    sources = db.scalars(select(Note).where(Note.id.in_(wanted), Note.user_id == user.id)).all()
    missing = wanted - {n.id for n in sources}
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Unknown note ids: {sorted(missing)}"
        )

    message = ChatMessage(conversation_id=conversation.id, role=payload.role, text=payload.text)
    message.sources = list(sources)
    if conversation.title is None and payload.role == ChatRole.USER:
        conversation.title = payload.text[:TITLE_FROM_PROMPT_CHARS]
    conversation.updated_at = func.now()  # bumps the thread to the top of the list
    db.add(conversation)
    save(db, message)
    return message
