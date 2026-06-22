from sqlalchemy import Boolean

from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import Base

class Message(Base):
    __tablename__="messages"

    id=Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id=Column(
        Integer,
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    sender_id=Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    content=Column(
        Text,
        nullable=False
    )
    is_read=Column(
        Boolean,
        default=False,
        nullable=False
    )
    created_at=Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    conversation=relationship(
        "Conversation",
        back_populates="messages"
    )
    sender=relationship(
        "User",
        back_populates="messages"
    )