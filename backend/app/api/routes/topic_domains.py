from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import TopicDomain
from app.schemas.topic_domain import TopicDomainRead

router = APIRouter(prefix="/topic-domains", tags=["Topic domains"])


@router.get("", response_model=list[TopicDomainRead])
def list_topic_domains(_: CurrentUser, db: DbSession):
    return db.scalars(select(TopicDomain).order_by(TopicDomain.position, TopicDomain.id)).all()


@router.get("/{domain_id}", response_model=TopicDomainRead)
def get_topic_domain(domain_id: str, _: CurrentUser, db: DbSession):
    domain = db.get(TopicDomain, domain_id)
    if domain is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="TopicDomain not found")
    return domain
