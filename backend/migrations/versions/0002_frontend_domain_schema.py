"""Schema for every frontend data type

- users: profile fields (name, track) + updated_at; drop redundant ix_users_id
- topic_domains (seeded) and topics
- notes: subject constrained to the four frontend subjects, tags, topic link,
  icon/kind, updated_at; content and user_id become NOT NULL
- courses, resources, study_sessions, agenda_tasks, attachments,
  focus_settings, conversations, chat_messages, chat_message_sources
- constraint names on users/notes renamed to the app's naming convention

Data rules for existing rows:
- users.name      <- local part of the email
- notes.subject   NULL or unknown values -> 'Computer Science' (frontend default)
- notes.content   NULL -> ''
- notes.user_id   NULL -> the oldest user; fails loudly if there is no user
- focus_settings  one default row per existing user

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-21
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# Snapshot of the app enums at the time of this migration (kept literal on purpose:
# later edits to app/models/enums.py must not rewrite history).
SUBJECTS = ("Computer Science", "Cellular Biology", "Mathematics", "Neuroscience")
TONES = ("blue", "teal", "violet", "slate", "amber")
SESSION_STATUSES = ("completed", "in-progress", "upcoming")
RESOURCE_TYPES = ("pdf", "video", "link", "slides")
CHAT_ROLES = ("user", "assistant")
REVIEW_FREQUENCIES = ("Daily", "Every 2 days", "Weekly")


def _in(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join("'" + v.replace("'", "''") + "'" for v in values)
    return f"{column} IN ({quoted})"


def _enum_check(table: str, column: str, values: tuple[str, ...]) -> sa.CheckConstraint:
    return sa.CheckConstraint(_in(column, values), name=f"ck_{table}_{column}")


def _owner(table: str) -> sa.Column:
    return sa.Column(
        "user_id",
        sa.Integer(),
        sa.ForeignKey("users.id", ondelete="CASCADE", name=f"fk_{table}_user_id_users"),
        nullable=False,
    )


def _topic_link(table: str) -> sa.Column:
    return sa.Column(
        "topic_id",
        sa.Integer(),
        sa.ForeignKey("topics.id", ondelete="SET NULL", name=f"fk_{table}_topic_id_topics"),
        nullable=True,
    )


def _timestamps(updated: bool = True) -> list[sa.Column]:
    cols = [sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)]
    if updated:
        cols.append(sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    return cols


def _varchar(length: int = 32) -> sa.String:
    return sa.String(length)


def upgrade() -> None:
    # ---- users -------------------------------------------------------------
    op.add_column("users", sa.Column("name", sa.String(100), nullable=True))
    op.execute("UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL")
    op.alter_column("users", "name", nullable=False)
    op.add_column("users", sa.Column("track", sa.String(100), server_default="", nullable=False))
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("UPDATE users SET updated_at = created_at")
    op.drop_index("ix_users_id", table_name="users")  # duplicate of the primary key index
    op.execute("ALTER TABLE users RENAME CONSTRAINT users_pkey TO pk_users")

    # ---- topic_domains (reference data) ------------------------------------
    topic_domains = op.create_table(
        "topic_domains",
        sa.Column("id", sa.String(20), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("short_label", sa.String(50), nullable=False),
        sa.Column("icon", sa.String(50), nullable=False),
        sa.Column("tone", _varchar(), nullable=False),
        sa.Column("subject", _varchar(), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_topic_domains"),
        _enum_check("topic_domains", "tone", TONES),
        _enum_check("topic_domains", "subject", SUBJECTS),
    )
    op.bulk_insert(
        topic_domains,
        [
            {"id": "cs", "label": "Computer Science & AI", "short_label": "CS & AI", "icon": "memory",
             "tone": "blue", "subject": "Computer Science", "position": 0},
            {"id": "bio", "label": "Biological Sciences", "short_label": "Biology", "icon": "biotech",
             "tone": "teal", "subject": "Cellular Biology", "position": 1},
            {"id": "math", "label": "Mathematics & Logic", "short_label": "Math & Logic", "icon": "calculate",
             "tone": "violet", "subject": "Mathematics", "position": 2},
        ],
    )

    # ---- topics ------------------------------------------------------------
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("topics"),
        sa.Column(
            "domain",
            sa.String(20),
            sa.ForeignKey("topic_domains.id", ondelete="RESTRICT", name="fk_topics_domain_topic_domains"),
            nullable=False,
        ),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("summary", sa.Text(), server_default="", nullable=False),
        sa.Column("badge", sa.String(50), nullable=True),
        sa.Column("meta", sa.String(80), nullable=True),
        sa.Column("meta_emphasis", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("footnote", sa.String(120), nullable=True),
        sa.Column("review_frequency", _varchar(), server_default="Daily", nullable=False),
        sa.Column("study_hours", sa.Numeric(6, 1), server_default="0", nullable=False),
        sa.Column("quiz_score", sa.Integer(), nullable=True),
        sa.Column("coverage", sa.Integer(), server_default="0", nullable=False),
        sa.Column("embeddings", sa.Integer(), server_default="0", nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_topics"),
        _enum_check("topics", "review_frequency", REVIEW_FREQUENCIES),
        sa.CheckConstraint("progress BETWEEN 0 AND 100", name="ck_topics_progress_range"),
        sa.CheckConstraint("coverage BETWEEN 0 AND 100", name="ck_topics_coverage_range"),
        sa.CheckConstraint("quiz_score IS NULL OR quiz_score BETWEEN 0 AND 100", name="ck_topics_quiz_score_range"),
        sa.CheckConstraint("embeddings >= 0", name="ck_topics_embeddings_non_negative"),
        sa.CheckConstraint("study_hours >= 0", name="ck_topics_study_hours_non_negative"),
    )
    op.create_index("ix_topics_user_id", "topics", ["user_id"])
    op.create_index("ix_topics_domain", "topics", ["domain"])

    # ---- notes (existing table) --------------------------------------------
    op.execute("UPDATE notes SET content = '' WHERE content IS NULL")
    op.alter_column("notes", "content", nullable=False, server_default="")

    op.execute(
        f"UPDATE notes SET subject = 'Computer Science' "
        f"WHERE subject IS NULL OR NOT ({_in('subject', SUBJECTS)})"
    )
    op.alter_column(
        "notes", "subject",
        type_=sa.String(32), existing_type=sa.String(150),
        nullable=False, server_default="Computer Science",
    )
    op.create_check_constraint("ck_notes_subject", "notes", _in("subject", SUBJECTS))

    op.alter_column("notes", "is_favorite", server_default=sa.false(), existing_nullable=False)
    op.alter_column("notes", "created_at", server_default=sa.func.now(), existing_nullable=False)
    op.add_column(
        "notes",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("UPDATE notes SET updated_at = created_at")
    op.add_column(
        "notes",
        sa.Column("tags", postgresql.ARRAY(sa.String(50)), server_default="{}", nullable=False),
    )
    op.add_column("notes", _topic_link("notes"))
    op.add_column("notes", sa.Column("icon", sa.String(50), nullable=True))
    op.add_column("notes", sa.Column("kind", sa.String(80), nullable=True))

    op.execute("UPDATE notes SET user_id = (SELECT min(id) FROM users) WHERE user_id IS NULL")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM notes WHERE user_id IS NULL) THEN
                RAISE EXCEPTION 'notes without an owner exist and there is no user to assign them to';
            END IF;
        END $$
    """)
    op.alter_column("notes", "user_id", nullable=False, existing_type=sa.Integer())

    op.execute("ALTER TABLE notes RENAME CONSTRAINT notes_pkey TO pk_notes")
    op.execute("ALTER TABLE notes RENAME CONSTRAINT notes_user_id_fkey TO fk_notes_user_id_users")
    op.create_index("ix_notes_topic_id", "notes", ["topic_id"])
    op.create_index("ix_notes_user_id_updated_at", "notes", ["user_id", "updated_at"])
    op.create_index("ix_notes_tags", "notes", ["tags"], postgresql_using="gin")

    # ---- courses -----------------------------------------------------------
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("courses"),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("summary", sa.String(255), server_default="", nullable=False),
        sa.Column("icon", sa.String(50), server_default="school", nullable=False),
        sa.Column("tone", _varchar(), nullable=False),
        sa.Column("subject", _varchar(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_courses"),
        sa.UniqueConstraint("user_id", "code", name="uq_courses_user_id_code"),
        _enum_check("courses", "tone", TONES),
        _enum_check("courses", "subject", SUBJECTS),
    )
    op.create_index("ix_courses_user_id", "courses", ["user_id"])

    # ---- resources ---------------------------------------------------------
    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("resources"),
        _topic_link("resources"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("type", _varchar(), nullable=False),
        sa.Column("subject", _varchar(), nullable=False),
        sa.Column("source", sa.String(200), nullable=False),
        sa.Column("detail", sa.String(100), nullable=True),
        sa.Column("url", sa.String(2048), nullable=True),
        sa.Column("is_pinned", sa.Boolean(), server_default=sa.false(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_resources"),
        _enum_check("resources", "type", RESOURCE_TYPES),
        _enum_check("resources", "subject", SUBJECTS),
    )
    op.create_index("ix_resources_user_id", "resources", ["user_id"])
    op.create_index("ix_resources_topic_id", "resources", ["topic_id"])

    # ---- study_sessions ----------------------------------------------------
    op.create_table(
        "study_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("study_sessions"),
        _topic_link("study_sessions"),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("subject", _varchar(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("goal", sa.String(255), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("status", _varchar(), server_default="upcoming", nullable=False),
        sa.Column("reminder", sa.Boolean(), server_default=sa.false(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_study_sessions"),
        _enum_check("study_sessions", "subject", SUBJECTS),
        _enum_check("study_sessions", "status", SESSION_STATUSES),
        sa.CheckConstraint(
            "duration_minutes BETWEEN 1 AND 480", name="ck_study_sessions_duration_minutes_range"
        ),
    )
    op.create_index("ix_study_sessions_user_id", "study_sessions", ["user_id"])
    op.create_index("ix_study_sessions_topic_id", "study_sessions", ["topic_id"])
    op.create_index("ix_study_sessions_user_id_starts_at", "study_sessions", ["user_id", "starts_at"])

    # ---- agenda_tasks ------------------------------------------------------
    op.create_table(
        "agenda_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("agenda_tasks"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("detail", sa.String(255), nullable=True),
        sa.Column("is_done", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("due_date", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_agenda_tasks"),
    )
    op.create_index("ix_agenda_tasks_user_id", "agenda_tasks", ["user_id"])
    op.create_index("ix_agenda_tasks_user_id_due_date", "agenda_tasks", ["user_id", "due_date"])

    # ---- attachments -------------------------------------------------------
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("attachments"),
        sa.Column(
            "study_session_id",
            sa.Integer(),
            sa.ForeignKey(
                "study_sessions.id", ondelete="SET NULL", name="fk_attachments_study_session_id_study_sessions"
            ),
            nullable=True,
        ),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(64), nullable=False),
        *_timestamps(updated=False),
        sa.PrimaryKeyConstraint("id", name="pk_attachments"),
        sa.UniqueConstraint("storage_key", name="uq_attachments_storage_key"),
    )
    op.create_index("ix_attachments_user_id", "attachments", ["user_id"])
    op.create_index("ix_attachments_study_session_id", "attachments", ["study_session_id"])

    # ---- focus_settings ----------------------------------------------------
    op.create_table(
        "focus_settings",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_focus_settings_user_id_users"),
            nullable=False,
        ),
        sa.Column("pomodoro_minutes", sa.Integer(), server_default="25", nullable=False),
        sa.Column("short_break_minutes", sa.Integer(), server_default="5", nullable=False),
        sa.Column("deep_work_minutes", sa.Integer(), server_default="50", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", name="pk_focus_settings"),
        *(
            sa.CheckConstraint(f"{col} BETWEEN 1 AND 180", name=f"ck_focus_settings_{col}_range")
            for col in ("pomodoro_minutes", "short_break_minutes", "deep_work_minutes")
        ),
    )
    op.execute("INSERT INTO focus_settings (user_id) SELECT id FROM users")

    # ---- conversations / chat ----------------------------------------------
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        _owner("conversations"),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("subject", _varchar(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_conversations"),
        _enum_check("conversations", "subject", SUBJECTS),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "conversation_id",
            sa.Integer(),
            sa.ForeignKey(
                "conversations.id", ondelete="CASCADE", name="fk_chat_messages_conversation_id_conversations"
            ),
            nullable=False,
        ),
        sa.Column("role", _varchar(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        *_timestamps(updated=False),
        sa.PrimaryKeyConstraint("id", name="pk_chat_messages"),
        _enum_check("chat_messages", "role", CHAT_ROLES),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])

    op.create_table(
        "chat_message_sources",
        sa.Column(
            "message_id",
            sa.Integer(),
            sa.ForeignKey(
                "chat_messages.id", ondelete="CASCADE", name="fk_chat_message_sources_message_id_chat_messages"
            ),
            nullable=False,
        ),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE", name="fk_chat_message_sources_note_id_notes"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("message_id", "note_id", name="pk_chat_message_sources"),
    )
    op.create_index("ix_chat_message_sources_note_id", "chat_message_sources", ["note_id"])


def downgrade() -> None:
    # Tables that only exist since 0002 (children first).
    for table in (
        "chat_message_sources",
        "chat_messages",
        "conversations",
        "focus_settings",
        "attachments",
        "agenda_tasks",
        "study_sessions",
        "resources",
        "courses",
    ):
        op.drop_table(table)

    # notes back to its 0001 shape. Normalised subjects/content and assigned owners stay as they are.
    op.drop_index("ix_notes_tags", table_name="notes")
    op.drop_index("ix_notes_user_id_updated_at", table_name="notes")
    op.drop_index("ix_notes_topic_id", table_name="notes")
    op.execute("ALTER TABLE notes RENAME CONSTRAINT fk_notes_user_id_users TO notes_user_id_fkey")
    op.execute("ALTER TABLE notes RENAME CONSTRAINT pk_notes TO notes_pkey")
    op.alter_column("notes", "user_id", nullable=True, existing_type=sa.Integer())
    for column in ("kind", "icon", "topic_id", "tags", "updated_at"):
        op.drop_column("notes", column)
    op.alter_column("notes", "created_at", server_default=None, existing_nullable=False)
    op.alter_column("notes", "is_favorite", server_default=None, existing_nullable=False)
    op.drop_constraint("ck_notes_subject", "notes", type_="check")
    op.alter_column(
        "notes", "subject",
        type_=sa.String(150), existing_type=sa.String(32), nullable=True, server_default=None,
    )
    op.alter_column("notes", "content", nullable=True, server_default=None)

    op.drop_table("topics")
    op.drop_table("topic_domains")

    op.execute("ALTER TABLE users RENAME CONSTRAINT pk_users TO users_pkey")
    op.create_index("ix_users_id", "users", ["id"])
    op.drop_column("users", "updated_at")
    op.drop_column("users", "track")
    op.drop_column("users", "name")
