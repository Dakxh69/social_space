from sqlalchemy import Column, Integer, ForeignKey,DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database.base import Base
from sqlalchemy.orm import relationship

class Follow(Base):
    __tablename__="follows"
    id=Column(Integer,primary_key=True,index=True)

    follower_id=Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    following_id=Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    created_at=Column(DateTime(timezone=True), server_default=func.now())
    follower=relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following"
    )
    following=relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="followers"
    )
    __table_args__=(
        UniqueConstraint(
            "follower_id",
            "following_id",
            name="unique_follower_following"
        ),
    )