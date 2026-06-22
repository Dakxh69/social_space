from sqlalchemy import Column,Integer,DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Conversation(Base):
    __tablename__="conversations"
    id=Column(
        Integer,
        primary_key=True,
        index=True
        )
    created_at=Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )
    participants=relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan"
    ) 