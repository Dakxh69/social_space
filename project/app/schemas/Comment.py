from pydantic import BaseModel

class CommentCreate(BaseModel):
    content:str

class CommentUpdate(BaseModel):
    content:str