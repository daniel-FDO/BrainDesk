# BrainDesk backend

FastAPI + SQLAlchemy 2 + PostgreSQL, schema managed by Alembic. The frontend reaches it at `/api/...` through the Vite dev proxy (`frontend/vite.config.ts`); for direct calls set `VITE_API_URL` in the frontend and list its origin in `CORS_ORIGINS` (a JSON list in `.env`).

## Layout

```
app/
  core/        config (.env via pydantic-settings), database (engine, Base, naming convention), security (hashing, JWT)
  models/      one SQLAlchemy model per file; enums.py + mixins.py are shared
  schemas/     one Pydantic module per model (Create / Update / Read)
  api/
    deps.py    DB session, current user (Bearer JWT), pagination
    crud.py    ownership checks, PATCH helpers
    routes/    one router per model
    router.py  mounts every router
  main.py      FastAPI app
migrations/    Alembic env + versions (0001 legacy fix-ups, 0002 full schema)
```

## Run

```bash
python -m venv .venv && .venv/Scripts/activate      # Windows; use bin/activate elsewhere
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload                       # docs at http://127.0.0.1:8000/docs
```

`.env` needs `DATABASE_URL`, `SECRET_KEY` (32+ random bytes) and optionally `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`.

## Migrations

The app never calls `create_all`; Alembic owns the schema.

```bash
alembic revision --autogenerate -m "describe change"   # after editing a model; review the file
alembic upgrade head
alembic check                                          # fails if models and DB have drifted
alembic downgrade -1
```

Enum columns are `VARCHAR(32)` + `CHECK` (not native Postgres enums). Autogenerate does **not** detect
CHECK changes, so when you add an enum value, swap the `ck_<table>_<column>` constraint by hand.

## Auth

`POST /auth/register` → `POST /auth/login` (form fields `username`=email, `password`) → send
`Authorization: Bearer <token>`. Every other route except `/` requires it, and all data is scoped to the caller.

## Frontend type → endpoint

Display-only strings (`"Edited 24m ago"`, `"Mon, Oct 21 • 4:00 PM"`) are not stored. The API returns real
timestamps for the frontend to format. Fields marked *derived* are computed per request.

| Frontend (`src/types.ts` etc.) | Endpoint(s) | Field mapping notes |
|---|---|---|
| `Profile` {name, track}, `user` {firstName, initials} | `GET/PATCH /users/me` | `first_name`, `initials` derived |
| Focus timer `FocusDurations` {pomodoro, short, deep} | `GET/PUT /users/me/focus-settings` | `*_minutes`, 1–180 |
| `Course` | `/courses` | `notes`, `resources`, `nextSession` → derived `notes_count`, `resources_count`, `next_session` (matched by `subject`) |
| `TopicDomain` (without `topics`) | `GET /topic-domains` | seeded `cs`/`bio`/`math`; its `topics` = `GET /topics?domain=` |
| `Topic`, `ApiTopic`, `topicDetails` | `/topics` | `metaEmphasis`→`meta_emphasis`; `notes`/`resources`/linkedNotes → derived counts; `studyHours`, `quizScore`, `coverage`, `embeddings`, review frequency stored |
| `Note`, `RecentNote`, `TopicNote` | `/notes` (`?q= &subject= &favorite= &topic_id= &tag= &sort=`) | `favorite`/`starred`→`is_favorite`; body→`content`; `excerpt`, `word_count` derived; `updated`/`edited`→`updated_at`; recent = `?sort=updated&limit=3` |
| `noteCounts` | `GET /notes/counts` | |
| `Resource` | `/resources` (`?q= &type= &subject= &pinned= &topic_id=`) | `pinned`→`is_pinned`; `added`→`created_at`; `source` defaults to the URL host |
| `StudySession`, `LearningBlock` | `/study-sessions` (`?starts_from= &starts_before= &status= &upcoming=`), `GET /study-sessions/next` | one table: `when`/`day`/`week`→`starts_at`; `minutes`→`duration_minutes`; `tag`, `tone`, `ends_at` derived; `isNext` = `/next` |
| `weeklyHours` | `GET /stats/weekly-hours?week_start=&tz=` | sums completed sessions |
| `AgendaTask` | `/agenda-tasks?due_date=` | `done`→`is_done`; `completed_at` set automatically |
| Planner `Attachment` {name, size, url} | `/attachments` (multipart upload), `GET /attachments/{id}/download` | `file_name`, `size_bytes`, `download_url` |
| `ChatMessage` + Assistant scope | `/conversations`, `POST /conversations/{id}/messages` | scope `'all'` → `subject: null`; `sources` → `source_note_ids` in, `[{id,title}]` out |
