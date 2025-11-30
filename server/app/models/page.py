from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("pages.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    slug = Column(String(300), nullable=False)
    content = Column(Text)
    is_public = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    author = relationship("User")
    parent = relationship("Page", remote_side=[id], backref="children")
    collaborators = relationship("PageCollaborator", back_populates="page")
    versions = relationship("PageVersion", back_populates="page")
    likes = relationship("PageLike", backref="page")

    def to_dict(self, include_like_count=False, db=None, user_id=None):
        result = {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "content": self.content,
            "is_public": self.is_public,
            "parent_id": self.parent_id,
            "author_id": self.author_id,
            "author": {
                "id": self.author.id,
                "username": self.author.username
            },
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
        
        if include_like_count and db:
            from app.models.page_like import PageLike
            like_count = db.query(PageLike).filter(PageLike.page_id == self.id).count()
            result["like_count"] = like_count
            
            if user_id:
                user_liked = db.query(PageLike).filter(
                    PageLike.page_id == self.id,
                    PageLike.user_id == user_id
                ).first() is not None
                result["user_liked"] = user_liked
        
        return result