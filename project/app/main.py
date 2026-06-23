from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.routers.auth import router
from app.routers.upload import router as upload_router
from app.routers.posts import router as post_router
from app.routers.users import router as users_router
from app.routers.chat import router as chat_router
from app.routers.chat_websocket import router as chat_ws_router
from app.utils.email_verification import (
    create_email_verification_token
)


app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(upload_router)
app.include_router(
    post_router,
    prefix="/posts",
    tags=["posts"]
                   
    )
app.include_router(users_router)
app.include_router(chat_router)
app.include_router(chat_ws_router)
