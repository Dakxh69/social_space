from datetime import datetime
from enum import Enum

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column,relationship

from app.database.base import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )
    profile_image:Mapped[str | None]=mapped_column(
        String(500),
        nullable=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole),
        default=UserRole.USER,
        nullable=False
    )

    is_blocked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    is_verified=mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    last_login: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    bio=mapped_column(String(500), nullable=True)

    posts = relationship(
        "Post",
        back_populates="user"
    )
    likes = relationship(
        "Like",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    followers = relationship(
        "Follow",
        foreign_keys="Follow.following_id",
        back_populates="following",
        cascade="all, delete-orphan"
    )
    following = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    conversation_participants = relationship(
        "ConversationParticipant",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message",
        back_populates="sender",
        cascade="all, delete-orphan"
    )