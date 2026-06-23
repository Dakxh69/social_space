from datetime import datetime,timedelta,timezone
from jose import JWTError,jwt
from app.core.config import settings


EMAIL_VERIFY_SECRET=settings.JWT_SECRET_KEY
EMAIL_VERIFY_ALGORITHM=settings.JWT_ALGORITHM

def create_email_verification_token(user_id: int):
    payload={
        "sub":str(user_id),
        "type":"email_verification",
        "exp": datetime.now(timezone.utc) +timedelta(hours=24)

    }
    return jwt.encode(
        payload,
        EMAIL_VERIFY_SECRET,
        algorithm=EMAIL_VERIFY_ALGORITHM
    )

def verify_email_verification_token(token:str):
    try:
        payload=jwt.decode(
            token,
            EMAIL_VERIFY_SECRET,
            algorithms=[EMAIL_VERIFY_ALGORITHM]
        )
        if payload.get("type")!="email_verification":
            return None
        return int(payload["sub"])
    except JWTError:
        return None
