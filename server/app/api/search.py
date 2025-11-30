from fastapi import APIRouter, Depends, HTTPException, status, Query, Security
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.models.collaborator import PageCollaborator
from app.core.security import decode_access_token
from sqlalchemy import or_, text
from typing import Optional

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: Optional[HTTPBearer] = Security(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None for guest access"""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if payload is None:
            return None
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(User).filter(User.username == username).first()
        return user
    except Exception:
        return None


@router.get("/")
def search_pages(
    q: str = Query(..., min_length=1),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Search pages. For guests: only public pages. For users: accessible pages."""
    search_term = f"%{q}%"
    
    if current_user is None:
        # Guest: only search public pages
        pages = db.query(Page).filter(
            Page.is_public == True,
            or_(
                Page.title.ilike(search_term),
                Page.content.ilike(search_term)
            )
        ).limit(50).all()
    elif current_user.role == "admin":
        # Admin: search all pages
        pages = db.query(Page).filter(
            or_(
                Page.title.ilike(search_term),
                Page.content.ilike(search_term)
            )
        ).limit(50).all()
    else:
        # User: search accessible pages
        collaborator_page_ids = db.query(PageCollaborator.page_id).filter(
            PageCollaborator.user_id == current_user.id
        ).subquery()
        
        pages = db.query(Page).filter(
            or_(
                Page.is_public == True,
                Page.author_id == current_user.id,
                Page.id.in_(db.query(collaborator_page_ids.c.page_id))
            ),
            or_(
                Page.title.ilike(search_term),
                Page.content.ilike(search_term)
            )
        ).limit(50).all()

    # Format results with highlights
    results = []
    for page in pages:
        # Simple highlight: find first occurrence
        title_highlight = page.title
        content_highlight = page.content[:200] + "..." if page.content and len(page.content) > 200 else (page.content or "")
        
        # Try to highlight search term (simple approach)
        if q.lower() in page.title.lower():
            idx = page.title.lower().find(q.lower())
            if idx >= 0:
                title_highlight = (
                    page.title[:idx] +
                    f"<mark>{page.title[idx:idx+len(q)]}</mark>" +
                    page.title[idx+len(q):]
                )
        
        results.append({
            "page": {
                "id": page.id,
                "title": page.title,
                "slug": page.slug,
                "content": page.content,
                "author": {
                    "id": page.author.id,
                    "username": page.author.username
                },
                "is_public": page.is_public,
                "created_at": page.created_at.isoformat(),
                "updated_at": page.updated_at.isoformat()
            },
            "highlight": {
                "title": title_highlight,
                "content": content_highlight
            }
        })

    return results