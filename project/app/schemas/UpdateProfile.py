from pydantic import BaseModel
from typing import Optional

class UpdateProfileRequest(BaseModel):
    bio: Optional[str] = None
    profile_image: Optional[str] = None