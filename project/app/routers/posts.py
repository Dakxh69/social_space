
from fastapi import APIRouter, UploadFile, File, Form, Depends,HTTPException, status,Query
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.comment import Comment
from app.schemas.Comment import CommentCreate, CommentUpdate

from app.models import comment
from app.models.follow import Follow
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
import os
import shutil
import cloudinary.uploader
from sqlalchemy import select,desc
from sqlalchemy.orm import selectinload


from app.models import Post, Like
router =APIRouter()

@router.post("/create")
async def create_post(
    caption: str = Form(""),
    media: UploadFile | None = File(None),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
  if not caption.strip() and media is None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Write something or choose a file to post")

  media_url = None
  media_type = None
  public_id = None

  if media is not None:
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, media.filename)

    with open(file_path, "wb") as buffer:
      shutil.copyfileobj(media.file, buffer)

    result = cloudinary.uploader.upload(
      file_path,
      resource_type="auto"
    )

    if os.path.exists(file_path):
      os.remove(file_path)

    media_url = result["secure_url"]
    media_type = result["resource_type"]
    public_id = result["public_id"]

  post = Post(
    caption=caption,
    media_url=media_url,
    media_type=media_type,
    public_id=public_id,
    user_id=current_user.id
 )

  db.add(post)

  await db.commit()

  await db.refresh(post)


  return {
    "message": "Post created successfully",
    "post_id": post.id,
    "caption": post.caption,
    "media_url": post.media_url,
    "user_id": post.user_id
  }

@router.get("/my-posts")
async def get_my_posts(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
    select(Post)
    .options(selectinload(Post.user))
    .order_by(Post.created_at.desc())
)
    result = await db.execute(stmt)
    posts = result.scalars().all()
    return [
       {
          "id": post.id,
          "caption": post.caption,
          "media_url": post.media_url,
          "media_type": post.media_type,
          "public_id": post.public_id,
          "created_at": post.created_at

       }
       for post in posts
    ]

@router.get("/feed")
async def get_feed(
    
    page:int=Query(1,ge=1),
    limit:int=Query(10,ge=1,le=50),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    

):
    following_result=await db.execute(
       select(Follow.following_id).where(Follow.follower_id==current_user.id)
    )
    following_ids=following_result.scalars().all()
    following_ids.append(current_user.id)
    offset=(page-1)*limit
    stmt = (
    select(Post).where(Post.user_id.in_(following_ids))
    .options(
        selectinload(Post.user),
        selectinload(Post.likes)
    )
    .order_by(desc(Post.created_at))
    .offset(offset)
    .limit(limit)
    )  
    result = await db.execute(stmt)
    posts = result.scalars().all()
    liked_post_ids = {
    like.post_id
    for post in posts
    for like in post.likes
    if like.user_id == current_user.id
   }
    return [
    {
        "id": post.id,
        "caption": post.caption,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "created_at": post.created_at,

        "likes_count": len(post.likes),

        "is_liked": post.id in liked_post_ids,

        "user": {
            "id": post.user.id,
            "name": post.user.name,
            "profile_image": post.user.profile_image
        }
    }
    for post in posts
]




@router.get("/{post_id}")
async def get_post_id(
   post_id:int,
   db:AsyncSession=Depends(get_db),
):
   stmt=select(Post).where(Post.id==post_id)

   result=await db.execute(stmt)
   post=result.scalar_one_or_none()

   if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
   return {
          "id": post.id,
          "caption": post.caption,
          "media_url": post.media_url,
          "media_type": post.media_type,
          "public_id": post.public_id,
          "created_at": post.created_at
   }
@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Post).where(Post.id == post_id)
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this post")

    if post.public_id:
        resource_type = "video" if post.media_type == "video" else "image"

        cloudinary.uploader.destroy(
            post.public_id,
            resource_type=resource_type,
        )

    await db.delete(post)
    await db.commit()
    return {"message": "Post deleted successfully"}
   
@router.post("/{post_id}/like")
async def like_post(
   post_id:int,
   current_user=Depends(get_current_user),
   db:AsyncSession=Depends(get_db),
):
   post_result=await db.execute(
      select(Post).where(Post.id==post_id)
   )
   post=post_result.scalar_one_or_none()

   if not post:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
   like_result=await db.execute(
      select(Like).where(
         Like.user_id==current_user.id,
         Like.post_id==post_id
      )
   )
   existing_like=like_result.scalar_one_or_none()
   if existing_like:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already liked this post")
   new_like=Like(
      user_id=current_user.id,
      post_id=post_id
   )
   db.add(new_like)
   await db.commit()
   return {"message": "Post liked successfully"}


@router.delete("/{post_id}/like")
async def unlike_post(
    post_id:int,
    current_user=Depends(get_current_user),
    db:AsyncSession=Depends(get_db),

):
    result=await db.execute(
        select(Like).where(
            Like.post_id==post_id,
            Like.user_id==current_user.id
        )
    )
    like=result.scalar_one_or_none()

    if not like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like not found")
    await db.delete(like)
    await db.commit()
    return {"message":"Post unliked successfully"}


@router.post("/{post_id}/comments")
async def create_comment(
   post_id:int,
   comment_data:CommentCreate,
   db:AsyncSession=Depends(get_db),
   current_user=Depends(get_current_user)
):
   stmt=select(Post).where(Post.id==post_id)
   result=await db.execute(stmt)
   post=result.scalar_one_or_none()
   if not post:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
   comment=Comment(
      content=comment_data.content,
      user_id=current_user.id,
      post_id=post_id
   )

   db.add(comment)
   await db.commit()
   await db.refresh(comment)
   return {
        "message":"Comment added successfully",
        "comment_id":comment.id,
        "content":comment.content
   }

@router.get("/{post_id}/comments")
async def get_comments(
   post_id:int,
   db:AsyncSession=Depends(get_db)
):
   stmt=select(Post).where(Post.id==post_id)
   result=await db.execute(stmt)
   post=result.scalar_one_or_none()
   if not post:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
   comments_result = await db.execute(
    select(Comment, User)
    .join(User, User.id == Comment.user_id)
    .where(Comment.post_id == post_id)
    .order_by(Comment.created_at.desc())
    )

   rows = comments_result.all()
   return {
    "count": len(rows),
    "comments": [
        {
            "id": comment.id,
            "content": comment.content,
            "user_id": user.id,
            "username": user.name,
            "created_at": comment.created_at
        }
        for comment, user in rows
    ]
}

@router.delete("/comments/{comment_id}")
async def delete_comment(
   comment_id:int,
   db:AsyncSession=Depends(get_db),
   current_user=Depends(get_current_user)

):
   result=await db.execute(
      select(Comment).where(Comment.id==comment_id)

   )
   comment=result.scalar_one_or_none()
   if not comment:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
   post_result=await db.execute(
      select(Post).where(Post.id==comment.post_id)
   )
   post=post_result.scalar_one_or_none()
   if(comment.user_id !=current_user.id and post.user_id !=current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")
   

   await db.delete(comment)
   await db.commit()
   return {"message":"Comment deleted successfully"}

@router.put("/comments/{comment_id}")
async def update_comment(
   comment_id:int,
   comment_data:CommentUpdate,
   db:AsyncSession=Depends(get_db),
   current_user=Depends(get_current_user)
):
   result=await db.execute(
      select(Comment).where(Comment.id==comment_id)
   )
   comment=result.scalar_one_or_none()
   if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
   if comment.user_id!=current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this comment")
   comment.content=comment_data.content
   await db.commit()
   await db.refresh(comment)
   return {
        "message":"Comment updated successfully",
        "comment":{
           "id":comment.id,
           "content":comment.content,
        }
    }
   