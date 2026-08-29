from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import URL
from redis_client import safe_redis_get, safe_redis_set, safe_redis_setex
from schemas import URLCreate, URLResponse, URLStatsResponse
from utils import generate_short_code

router = APIRouter()

DEFAULT_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days default cache for non-expiring URLs


def record_click_background(short_code: str):
    """Increment click count in the database asynchronously."""
    db: Session = SessionLocal()
    try:
        url = db.query(URL).filter(URL.short_code == short_code).first()
        if url:
            url.click_count = (url.click_count or 0) + 1
            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


def ensure_timezone_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.post("/urls", response_model=URLResponse, status_code=status.HTTP_201_CREATED)
def create_url(
    url_data: URLCreate,
    db: Session = Depends(get_db)
):
    # Default expiration: 2 days if not specified
    expires_at = url_data.expires_at
    if expires_at is None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=2)

    # Collision-safe code generation
    short_code = None
    for _ in range(5):
        candidate_code = generate_short_code()
        existing = db.query(URL.id).filter(URL.short_code == candidate_code).first()
        if not existing:
            short_code = candidate_code
            break

    if not short_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate a unique short code. Please try again."
        )

    original_url_str = str(url_data.original_url)

    new_url = URL(
        short_code=short_code,
        original_url=original_url_str,
        expires_at=expires_at,
        click_count=0
    )

    db.add(new_url)
    db.commit()
    db.refresh(new_url)

    # Warm Redis cache on creation
    now = datetime.now(timezone.utc)
    aware_expires_at = ensure_timezone_aware(new_url.expires_at)
    if aware_expires_at:
        remaining_seconds = int((aware_expires_at - now).total_seconds())
        if remaining_seconds > 0:
            safe_redis_setex(f"url:{short_code}", remaining_seconds, original_url_str)
    else:
        safe_redis_setex(f"url:{short_code}", DEFAULT_CACHE_TTL_SECONDS, original_url_str)

    return new_url


@router.get("/urls/{short_code}", response_model=URLStatsResponse)
def get_url_stats(
    short_code: str,
    db: Session = Depends(get_db)
):
    """Retrieve details and click analytics for a shortened URL."""
    url = db.query(URL).filter(URL.short_code == short_code).first()
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found"
        )

    now = datetime.now(timezone.utc)
    aware_expires_at = ensure_timezone_aware(url.expires_at)
    is_expired = aware_expires_at is not None and aware_expires_at <= now

    return {
        "id": url.id,
        "short_code": url.short_code,
        "original_url": url.original_url,
        "created_at": url.created_at,
        "expires_at": url.expires_at,
        "click_count": url.click_count,
        "is_expired": is_expired,
    }


@router.get("/{short_code}")
def redirect_url(
    short_code: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Check Redis cache
    cached_url = safe_redis_get(f"url:{short_code}")
    if cached_url:
        # Increment click count in background even on cache hit
        background_tasks.add_task(record_click_background, short_code)
        return RedirectResponse(
            url=cached_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

    # 2. Cache miss -> check PostgreSQL
    url = (
        db.query(URL)
        .filter(URL.short_code == short_code)
        .first()
    )

    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found"
        )

    # 3. Check expiration
    now = datetime.now(timezone.utc)
    aware_expires_at = ensure_timezone_aware(url.expires_at)

    if aware_expires_at is not None:
        if aware_expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Short URL has expired"
            )

        remaining_seconds = int((aware_expires_at - now).total_seconds())
        if remaining_seconds > 0:
            safe_redis_setex(
                f"url:{short_code}",
                remaining_seconds,
                url.original_url
            )
    else:
        # URL has no expiration, cache with default TTL
        safe_redis_setex(
            f"url:{short_code}",
            DEFAULT_CACHE_TTL_SECONDS,
            url.original_url
        )

    # 4. Increment click count in background
    background_tasks.add_task(record_click_background, short_code)

    # 5. Redirect
    return RedirectResponse(
        url=url.original_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT
    )