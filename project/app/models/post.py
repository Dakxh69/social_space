
from sqlalchemy import Column, Integer, String, ForeignKey,DateTime
from sqlalchemy.sql import func
from app.database.base import Base
from sqlalchemy.orm import relationship

class Post(Base):
    __tablename__="posts"
    id=Column(Integer, primary_key=True, index=True)
    caption=Column(String, nullable=False)
    media_url=Column(String, nullable=True)
    media_type=Column(String, nullable=True)
    public_id=Column(String, nullable=True)

    user_id=Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False

    )
    created_at=Column(DateTime(timezone=True), server_default=func.now())

    user=relationship(
        "User",
        back_populates="posts"
    )
    likes=relationship(
        "Like",
        back_populates="post",
        cascade="all, delete-orphan"
    )
    comments=relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan"
    )


