from sqlalchemy import Column, BigInteger, Text, DateTime
from sqlalchemy.sql import func

from database import Base


class URL(Base):
    __tablename__ = "urls"

    id = Column(BigInteger, primary_key=True, index=True)
    short_code = Column(Text, unique=True, nullable=False, index=True)
    original_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    click_count = Column(BigInteger, default=0)