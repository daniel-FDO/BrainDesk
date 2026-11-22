"""Bring users/notes in line with models.py

- users.created_at added (table predates the column)
- drop the unique index on users.hashed_password
- notes.user_id FK -> users.id (already applied by hand; kept idempotent)
- notes.created_at -> TIMESTAMP WITH TIME ZONE (model uses timezone=True)

Revision ID: 0001
Revises:
Create Date: 2026-11-21
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Statements use IF [NOT] EXISTS because parts of this schema were
    # created by create_all / by hand before Alembic was introduced.
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at "
        "TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()"
    )
    op.execute("DROP INDEX IF EXISTS ix_users_hashed_password")

    # On databases that predate Alembic, create_all made this table. A fresh
    # database needs it created here so the ALTERs below have something to alter.
    op.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            content TEXT,
            subject VARCHAR(150),
            is_favorite BOOLEAN NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
        )
    """)

    op.execute(
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER "
        "REFERENCES users(id) ON DELETE CASCADE"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_notes_user_id ON notes (user_id)")

    # Existing timestamps were written as UTC (datetime.now(timezone.utc)).
    op.execute(
        "ALTER TABLE notes ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE "
        "USING created_at AT TIME ZONE 'UTC'"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE notes ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE "
        "USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute("DROP INDEX IF EXISTS ix_notes_user_id")
    op.execute("ALTER TABLE notes DROP COLUMN IF EXISTS user_id")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_hashed_password "
        "ON users (hashed_password)"
    )
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS created_at")
