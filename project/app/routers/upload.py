from fastapi import APIRouter,UploadFile,File
from app.services.cloudinary_service import upload_image

router=APIRouter()
@router.post("/upload")
def upload(file:UploadFile=File(...)):
    image_url=upload_image(file)
    return {"image_url":image_url}