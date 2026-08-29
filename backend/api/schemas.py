from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class URLCreate(BaseModel):
    original_url: HttpUrl
    expires_at: Optional[datetime] = None


class URLResponse(BaseModel):
    short_code: str
    original_url: str
    expires_at: Optional[datetime] = None