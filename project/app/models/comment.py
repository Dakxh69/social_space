from sqlalchemy import Column,Integer,ForeignKey,Text,DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import Base

class Comment(Base):
    __tablename__="comments"

    id=Column(
        Integer,
        primary_key=True,
        index=True
    )

    content=Column(
        Text,
        nullable=False
    )

    user_id=Column(
        Integer,
        ForeignKey("users.id",ondelete="CASCADE"),
        nullable=False
    )

    post_id=Column(
        Integer,
        ForeignKey("posts.id",ondelete="CASCADE"),
        nullable=False
    )

    created_at=Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at=Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user=relationship("User",back_populates="comments")
    post=relationship("Post",back_populates="comments")
    