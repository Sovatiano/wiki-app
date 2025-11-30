from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class PageVersion(Base):
    __tablename__ = "page_versions"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    text = Column(Text, nullable=False)
    version_comment = Column(String(500))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    page = relationship("Page", back_populates="versions")
    author = relationship("User")