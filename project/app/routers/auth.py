from fastapi import APIRouter, Depends,Form,UploadFile,File,HTTPException,Response
from app.services.cloudinary_service import upload_image
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,or_
from app.schemas.user import UserCreate,UserLogin
from app.dependencies.security import hash_password,create_access_token, verify_password
from app.utils.email_verification import(
   create_email_verification_token,
   verify_email_verification_token
)
from app.services.email_service import send_verification_email


from app.database.session import get_db
from app.models import User
from app.dependencies.auth import get_current_admin_user, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


@router.get("/users")
async def get_users(
   db: AsyncSession = Depends(get_db),
   _: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User)
    )

    users = result.scalars().all()

    return users

@router.post("/register")
async def register_user(
   response:Response,
    name:str=Form(...),
    email:str=Form(...),
    password:str=Form(...),
    profile_image:UploadFile | None =File(None),
    db:AsyncSession=Depends(get_db)
):
    image_url=None
    if profile_image:
     image_url=upload_image(profile_image)

    existing_user = await db.scalar(
        select(User).where(User.email == email)
    )
    if existing_user:
       raise HTTPException(
          status_code=400,
          detail="Email already registered"
       )
    
    existing_user_by_name=await db.scalar(
       select(User).where(User.name==name)
    )
    if existing_user_by_name:
        raise HTTPException(
             status_code=400,
             detail="Username already taken"
        )

     
    hashed_password=hash_password(password)
    new_user=User(
        name=name,
        email=email,
        password_hash=hashed_password,
        profile_image=image_url
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    verification_token=create_email_verification_token(
       new_user.id
    )
    verification_link=f"http://localhost:8000/auth/verify-email?token={verification_token}"
    await send_verification_email(
        email=new_user.email,
        name=new_user.name,
        verification_link=verification_link
    )
    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "profile_image": new_user.profile_image,
            "is_verified": new_user.is_verified
        }
    }

@router.get("/verify-email")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    user_id = verify_email_verification_token(token)

    print("USER ID:", user_id)

    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired token"
        )

    user = await db.get(User, user_id)

    print("USER:", user)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.is_verified = True

    print("BEFORE COMMIT:", user.is_verified)

    await db.commit()
    await db.refresh(user)

    print("AFTER COMMIT:", user.is_verified)

    return {
        "message": "Email verified successfully"
    }



@router.post("/login")
async def login_user(
   response:Response,
   user:UserLogin,
   db:AsyncSession=Depends(get_db)
):
   existing_user=await db.scalar(
        select(User).where(
           or_(
              User.email==user.identifier,
              User.name==user.identifier
           )
        )
   )
   

   if not existing_user:
      raise HTTPException(
         status_code=400,
         detail="invalid email or name"
      )
   
   verify_password(
      user.password,
      existing_user.password_hash
   )

   if not verify_password(
    user.password,
    existing_user.password_hash
   ):
     raise HTTPException(
        status_code=401,
        detail="Invalid  password"
     )
   
   db_user=await db.scalar(
      select(User).where(
         (User.email==existing_user.email) | (User.name==existing_user.name)
      )
   )

   if not db_user.is_verified:
      raise HTTPException(
         status_code=403,
         detail="Email not verified"
      )
   
   
   token=create_access_token(
      {
         "user_id":existing_user.id,
         "email":existing_user.email
      }
   )
   response.set_cookie(
      key="access_token",
      value=token,
      httponly=True,
      samesite="lax",
      max_age=60*60*24*2
   )

   return {
      "message":"Login successful"
   }


@router.get("/me")
async def get_me(
   current_user: User = Depends(get_current_user)
):
   return{
      "id":current_user.id,
      "name":current_user.name,
      "email":current_user.email,
      "profile_image":current_user.profile_image,
      "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
   }


@router.post("/logout")
async def logout_user(
   response:Response
):
   response.delete_cookie("access_token")
   return {
      "message":"Logout successful"
   }




