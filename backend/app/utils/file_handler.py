import os
import uuid
from fastapi import UploadFile
from app.config import settings

async def save_upload(file: UploadFile, subfolder: str = "") -> str:
    """Save an uploaded file and return the relative path."""
    upload_dir = os.path.join(settings.UPLOAD_DIR, subfolder) if subfolder else settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_name)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    return os.path.join(subfolder, unique_name) if subfolder else unique_name
