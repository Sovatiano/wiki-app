from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.models.page_like import PageLike
from app.core.security import get_current_user, decode_access_token
from typing import List, Optional

security = HTTPBearer(auto_error=False)

router = APIRouter()


def get_page_by_id_or_slug(page_id_or_slug: str, db: Session) -> Optional[Page]:
    """Get page by ID (int) or slug (str)"""
    try:
        page_id = int(page_id_or_slug)
        return db.query(Page).filter(Page.id == page_id).first()
    except ValueError:
        return db.query(Page).filter(Page.slug == page_id_or_slug).first()


@router.post("/pages/{page_id}/like")
def like_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a page"""
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check if already liked
    existing_like = db.query(PageLike).filter(
        PageLike.page_id == page.id,
        PageLike.user_id == current_user.id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Page already liked")

    like = PageLike(
        page_id=page.id,
        user_id=current_user.id
    )

    db.add(like)
    db.commit()
    db.refresh(like)

    return {"message": "Page liked", "liked": True}


@router.delete("/pages/{page_id}/like")
def unlike_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlike a page"""
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    like = db.query(PageLike).filter(
        PageLike.page_id == page.id,
        PageLike.user_id == current_user.id
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    db.delete(like)
    db.commit()

    return {"message": "Page unliked", "liked": False}


@router.get("/pages/{page_id}/likes")
def get_page_likes(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get like count and whether current user liked the page"""
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    like_count = db.query(PageLike).filter(PageLike.page_id == page.id).count()
    user_liked = db.query(PageLike).filter(
        PageLike.page_id == page.id,
        PageLike.user_id == current_user.id
    ).first() is not None

    return {
        "page_id": page.id,
        "like_count": like_count,
        "user_liked": user_liked
    }


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
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





