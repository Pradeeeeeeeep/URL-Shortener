from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta


from database import get_db
from models import URL
from schemas import URLCreate
from utils import generate_short_code

router = APIRouter()


@router.post("/urls")
def create_url(
    url_data: URLCreate,
    db: Session = Depends(get_db)
):
    # Default expiration: 2 days
    expires_at = url_data.expires_at

    if expires_at is None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=2)

    short_code = generate_short_code()

    new_url = URL(
        short_code=short_code,
        original_url=str(url_data.original_url),
        expires_at=expires_at
    )

    db.add(new_url)
    db.commit()
    db.refresh(new_url)

    return {
        "id": new_url.id,
        "short_code": new_url.short_code,
        "original_url": new_url.original_url,
        "expires_at": new_url.expires_at
    }

@router.get("/{short_code}")
def redirect_url(
    short_code: str,
    db: Session = Depends(get_db)
):
    url = (
        db.query(URL)
        .filter(URL.short_code == short_code)
        .first()
    )

    if not url:
        raise HTTPException(
            status_code=404,
            detail="Short URL not found"
        )

    # Check expiration
    if url.expires_at is not None:
        if url.expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=410,
                detail="Short URL has expired"
            )

    # Increment click count
    url.click_count += 1
    db.commit()

    return RedirectResponse(
        url=url.original_url,
        status_code=307
    )