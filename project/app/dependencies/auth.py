from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.dependencies.security import decode_access_token
from app.models import User


async def get_current_user(
	request: Request,
	db: AsyncSession = Depends(get_db),
):
	token = request.cookies.get("access_token")
	if not token:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Not authenticated",
		)

	try:
		payload = decode_access_token(token)
	except JWTError:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or expired token",
		)

	user_id = payload.get("user_id")
	if not user_id:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Not authenticated",
		)

	current_user = await db.scalar(select(User).where(User.id == user_id))
	if not current_user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User not found",
		)

	return current_user


async def get_current_admin_user(current_user: User = Depends(get_current_user)):
	if current_user.role.value if hasattr(current_user.role, "value") else current_user.role != "admin":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Not authorized",
		)

	return current_user
