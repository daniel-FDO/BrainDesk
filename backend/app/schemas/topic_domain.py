from app.models.enums import Subject, Tone
from app.schemas.common import ORMModel


class TopicDomainRead(ORMModel):
    id: str
    label: str
    short_label: str
    icon: str
    tone: Tone
    subject: Subject
    position: int
