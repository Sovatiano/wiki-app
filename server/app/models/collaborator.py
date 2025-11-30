from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class PageCollaborator(Base):
    __tablename__ = "page_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_level = Column(String(10), nullable=False)  # 'read' or 'write'
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    page = relationship("Page", back_populates="collaborators")
    user = relationship("User")