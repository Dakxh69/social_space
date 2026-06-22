from fastapi import APIRouter, Depends, HTTPException
from app.schemas.message import MessageCreate
from app.routers.chat_websocket import manager
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies.auth import get_current_user

from app.models.user import User
from app.models.message import Message
from app.models.Conversation import Conversation
from app.models.ConversationParticipant import ConversationParticipant

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/start/{user_id}")
async def start_conversation(
    user_id:int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_id==current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start conversation with yourself")
    
    user_result=await db.execute(
        select(User).where(
            User.id==user_id
        )
    )
    target_user=user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    semt=select(Conversation).join(
        ConversationParticipant, 
        Conversation.id==ConversationParticipant.conversation_id
    ).where(
        ConversationParticipant.user_id.in_(
            [current_user.id, user_id]
        )
    ).group_by(Conversation.id).having(
        func.count(ConversationParticipant.user_id)==2
    )
    result=await db.execute(semt)

    existing_conversation_id=result.scalar_one_or_none()
    if existing_conversation_id:
        return {"conversation_id":existing_conversation_id}
    new_conversation=Conversation()
    db.add(new_conversation)
    await db.flush()

    participant1=ConversationParticipant(
        conversation_id=new_conversation.id,
        user_id=current_user.id
    )
    participant2=ConversationParticipant(
        conversation_id=new_conversation.id,
        user_id=user_id
    )
    db.add(participant1)
    db.add(participant2)
    await db.commit()
    return {"conversation_id":new_conversation.id}

@router.post("/{conversation_id}/message")
async def send_message(
    conversation_id:int,
    message:MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result=await db.execute(
        select(Conversation).where(
            Conversation.id==conversation_id
        )
    )
    conversation=result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    participant_result=await db.execute(
        select(ConversationParticipant).where(

            ConversationParticipant.conversation_id==conversation_id,
            ConversationParticipant.user_id==current_user.id
        )
    )
    participant=participant_result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")       
    message_obj=Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message.content

    )
    db.add(message_obj)
    await db.commit()
    await db.refresh(message_obj)
    return {
        "message": "Message sent successfully",
        "data": {
            "id": message_obj.id,
            "conversation_id": message_obj.conversation_id,
            "sender_id": message_obj.sender_id,
            "content": message_obj.content,
            "created_at": message_obj.created_at
        }
    }   

@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id:int,
    current_user: User = Depends(get_current_user),
    db:AsyncSession = Depends(get_db)
):
    participant_result=await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id==conversation_id,
            ConversationParticipant.user_id==current_user.id
        )
    )
    participant=participant_result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")
    messages_result=await db.execute(
        select(Message).where(
            Message.conversation_id==conversation_id
        ).order_by(Message.created_at)
    )
    messages=messages_result.scalars().all()
    return {
        "count": len(messages),
        "messages": [
            {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "created_at": msg.created_at
            }
            for msg in messages
        ]
    }

@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConversationParticipant)
        .where(
            ConversationParticipant.user_id ==
            current_user.id
        )
    )

    my_participations = result.scalars().all()
    conversations = []
    for participation in my_participations:
        conversation_id=(participation.conversation_id)
        other_user_result=await db.execute(
            select(User).join(
                ConversationParticipant,
                User.id == ConversationParticipant.user_id
            ).where(
                ConversationParticipant.conversation_id == conversation_id,
                User.id != current_user.id
            )
        )
        other_user=other_user_result.scalar_one_or_none()
        if not other_user:
            continue
        is_online=manager.is_online(other_user.id)
        last_message_result=await db.execute(
            select(Message).where(
                Message.conversation_id==conversation_id
            ).order_by(
                Message.created_at.desc()
            )
            .limit(1)
        )
        last_message=last_message_result.scalar_one_or_none()
        unread_result = await db.execute(
            select(func.count(Message.id))
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_id != current_user.id,
                Message.is_read == False
            )
        )

        unread_count = unread_result.scalar()
        if other_user:
            conversations.append({
                "conversation_id": conversation_id,
                "other_user": {
                    "id": other_user.id,
                    "username": other_user.name,
                    "profile_picture": other_user.profile_image,
                    "is_online": is_online
                },
                "Last_message":(
                    last_message.content if last_message else None
                ),
                "last_message_time":(
                    last_message.created_at if last_message else None
                ),
                "unread_count": unread_count
            })
    conversations.sort(
        key=lambda x:(x["last_message_time"] or ""),reverse=True
    )
    return conversations

@router.patch("/{conversation_id}/read")
async def mark_as_read(
    conversation_id:int,
    current_user:User=Depends(get_current_user),
    db:AsyncSession=Depends(get_db)
):
    participant_result=await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id==conversation_id,
            ConversationParticipant.user_id==current_user.id
        )
    )
    participant=participant_result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")
    await db.execute(
        update(Message).where(
            Message.conversation_id==conversation_id,
            Message.sender_id!=current_user.id,
            Message.is_read==False

        ).values(is_read=True)
    )
    await db.commit()
    return {"message":"Messages marked as read"}

@router.get("/{conversation_id}/unread_count")
async def get_unread_count(
    current_user:User=Depends(get_current_user),
    db:AsyncSession=Depends(get_db),
):
    result = await db.execute(
        select(func.count(Message.id))
        .where(
            Message.sender_id != current_user.id,
            Message.is_read == False
        )
    )

    unread_count = result.scalar()

    return {
        "unread_count": unread_count
    }