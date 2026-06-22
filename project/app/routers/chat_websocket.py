from app.models.message import Message

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database.session import AsyncSessionLocal


router=APIRouter()
class ConnectionManager:
    def __init__(self):
        self.active_connections={}
    async def connect(
            self,
            user_id:int,
            websocket:WebSocket
    ):
        await websocket.accept()
        self.active_connections[user_id]=websocket
    def disconnect(
            self,
            user_id:int
    ):
        self.active_connections.pop(
            user_id,
            None
        )
    async def send_personal_message(
            self,
            user_id:int,
            message:dict
    ):
        websocket=self.active_connections.get(
            user_id
        )
        if websocket:
            await websocket.send_json(
                message
            )
    def is_online(
            self,
            user_id:int
    ):
        return user_id in self.active_connections
        
manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int
):

    await manager.connect(
        user_id,
        websocket
    )
    db=AsyncSessionLocal()

    try:

        while True:

            data = await websocket.receive_json()
            message_type=data.get("type")
            if message_type == "typing":

            

                receiver_id = data["receiver_id"]

                await manager.send_personal_message(
                    receiver_id,
                    {
                        "type": "typing",
                        "user_id": user_id
                    }
                )
                continue

            if message_type=="stop_typing":

                receiver_id=data["receiver_id"]

                await manager.send_personal_message(
                    receiver_id,
                    {
                        "type":"stop_typing",
                        "user_id": user_id
                    }
                )
                continue
            receiver_id=data["receiver_id"]
            conversation_id=data["conversation_id"]
            content=data["content"]
            message=Message(
                conversation_id=conversation_id,
                sender_id=user_id,
                content=content,
                is_read=False
            )
            db.add(message)
            await db.commit()
            await db.refresh(message)
            await manager.send_personal_message(
                receiver_id,
                {
                "id": message.id,
                "conversation_id": message.conversation_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "created_at": str(message.created_at)                    
                }
            )
            await manager.send_personal_message(
                user_id,
                {
                    "id": message.id,
                    "conversation_id": message.conversation_id,
                    "sender_id": message.sender_id,
                    "content": message.content,
                    "created_at": str(message.created_at)
                }
            )

    except WebSocketDisconnect:

        manager.disconnect(
            user_id
        )
    finally:
        
        await db.close()