from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, HttpUrl


class URLCreate(BaseModel):
    original_url: HttpUrl
    expires_at: Optional[datetime] = None


class URLResponse(BaseModel):
    id: int
    short_code: str
    original_url: str
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    click_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class URLStatsResponse(BaseModel):
    id: int
    short_code: str
    original_url: str
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    click_count: int = 0
    is_expired: bool = False

    model_config = ConfigDict(from_attributes=True)