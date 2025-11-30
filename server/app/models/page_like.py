from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class PageLike(Base):
    __tablename__ = "page_likes"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Unique constraint: one like per user per page
    __table_args__ = (UniqueConstraint('page_id', 'user_id', name='unique_page_user_like'),)

