from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

# The schema is owned by Alembic (`alembic upgrade head`); the app never creates tables itself.
app = FastAPI(title="BrainDesk backend")

# Only matters when the browser calls FastAPI directly (VITE_API_URL set, or a deployed
# frontend). Through the Vite dev proxy every request is same-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def health_check():
    return {"message": "All good"}


app.include_router(api_router)
