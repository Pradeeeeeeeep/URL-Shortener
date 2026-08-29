from __future__ import annotations
import logging
import os
from typing import Optional
import redis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

try:
    redis_client = redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2
    )
except Exception as e:
    logger.warning(f"Failed to initialize Redis client: {e}")
    redis_client = None


def safe_redis_get(key: str) -> Optional[str]:

    if not redis_client:
        return None
    try:
        return redis_client.get(key)
    except redis.RedisError as e:
        logger.warning(f"Redis get failed for key {key}: {e}")
        return None


def safe_redis_setex(key: str, seconds: int, value: str) -> bool:
    if not redis_client or seconds <= 0:
        return False
    try:
        redis_client.setex(key, seconds, value)
        return True
    except redis.RedisError as e:
        logger.warning(f"Redis setex failed for key {key}: {e}")
        return False


def safe_redis_set(key: str, value: str) -> bool:
    if not redis_client:
        return False
    try:
        redis_client.set(key, value)
        return True
    except redis.RedisError as e:
        logger.warning(f"Redis set failed for key {key}: {e}")
        return False


def test_redis():
    if not redis_client:
        print("Redis client not initialized")
        return
    redis_client.set("test_key", "hello")
    value = redis_client.get("test_key")
    print("Redis value:", value)