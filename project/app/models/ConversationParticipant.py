from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base

class ConversationParticipant(Base):
    __tablename__="conversation_participants"
    id=Column(
        Integer,
        primary_key=True,
        index=True

    )
    conversation_id = Column(
        Integer,
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    conversation = relationship("Conversation",back_populates="participants")
    user = relationship("User",back_populates="conversation_participants")
