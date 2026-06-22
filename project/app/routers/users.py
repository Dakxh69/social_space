from unittest import result

from fastapi import APIRouter, UploadFile, File, Form, Depends,HTTPException, status,Query
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas import user
from app.models.follow import Follow
from app.schemas.UpdateProfile import UpdateProfileRequest
from app.services.cloudinary_service import upload_image
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db

from sqlalchemy import select,desc
from sqlalchemy.orm import selectinload


from app.models import Post, Like
router =APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.put("/profile")
async def update_profile(
    bio: str | None= Form(None),
    profile_image: UploadFile | None = File(None),
    
    current_user:User=Depends(get_current_user),
    db:AsyncSession=Depends(get_db)
):
    result=await db.execute(
        select(User).where(User.id==current_user.id)
    )
    user=result.scalar_one_or_none()
    if bio is not None:
        user.bio=bio
    image_url=upload_image(profile_image) if profile_image else None
    if image_url:
        user.profile_image=image_url
    await db.commit()
    await db.refresh(user)
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "bio": user.bio,
            "profile_image": user.profile_image
        }
    }

@router.get("/search")
async def search_users(
   q:str=Query(...,min_length=1),
   db:AsyncSession=Depends(get_db),
):
   stmt=select(User).where(User.name.ilike(f"%{q}%"))
   result=await db.execute(stmt)
   users=result.scalars().all()
   return [
      {
         "id":user.id,
         "name":user.name,
         
         "profile_image":user.profile_image
      }
      for user in users
   ]


@router.post("/{user_id}/follow")
async def follow_user(
    user_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    
    # Khud ko follow nahi kar sakte
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot follow yourself"
        )

    # User exist karta hai ya nahi
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user_to_follow = result.scalar_one_or_none()

    if not user_to_follow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Already follow kar raha hai?
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    )

    existing_follow = result.scalar_one_or_none()

    if existing_follow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already following"
        )

    # Follow create karo
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_id
    )

    db.add(follow)

    await db.commit()

    return {
        "message": f"You are now following {user_to_follow.name}"
    }

@router.delete("/{user_id}/unfollow")
async def unfollow_user(
    user_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Khud ko unfollow nahi kar sakte
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot unfollow yourself"
        )

    # User exist karta hai ya nahi
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user_to_unfollow = result.scalar_one_or_none()

    if not user_to_unfollow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Already follow kar raha hai?
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    )

    existing_follow = result.scalar_one_or_none()

    if not existing_follow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not following this user"
        )

    # Unfollow karo
    await db.delete(existing_follow)
    await db.commit()

    return {
        "message": f"You have unfollowed {user_to_unfollow.name}"
    }

@router.get("/{user_id}/following")
async def get_following(
    user_id:int,
    db:AsyncSession=Depends(get_db)
):
    user_result=await db.execute(
        select(User).where(User.id==user_id)
    )
    user=user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    stmt=select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == user_id)
    result=await db.execute(stmt)
    following=result.scalars().all()
    return {
        "count":len(following),
        "following":[
            {
                "id":user.id,
                "name":user.name,
                "profile_image":user.profile_image
            }
            for user in following
        ]
    }

@router.get("/{user_id}/followers")
async def get_followers(
    user_id:int,
    db:AsyncSession=Depends(get_db)
):
    stmt=select(User).where(User.id==user_id)
    user_result= await db.execute(stmt)
    user=user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    stmt=select(User).join(Follow,Follow.follower_id==User.id).where(Follow.following_id==user_id)

    result=await db.execute(stmt)
    followers=result.scalars().all()
    return {
        "count":len(followers),
        "followers":[
            {
                "id":user.id,
                "name":user.name,
                "profile_image":user.profile_image
            }
            for user in followers
        ]
    }

@router.get("/{user_id}")
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {
        "id": user.id,
        "name": user.name,
        "bio": user.bio,
        "profile_image": user.profile_image
    }

