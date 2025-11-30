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


@router.post("/pages/{page_id}/like")
def like_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a page"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check if already liked
    existing_like = db.query(PageLike).filter(
        PageLike.page_id == page_id,
        PageLike.user_id == current_user.id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Page already liked")

    like = PageLike(
        page_id=page_id,
        user_id=current_user.id
    )

    db.add(like)
    db.commit()
    db.refresh(like)

    return {"message": "Page liked", "liked": True}


@router.delete("/pages/{page_id}/like")
def unlike_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlike a page"""
    like = db.query(PageLike).filter(
        PageLike.page_id == page_id,
        PageLike.user_id == current_user.id
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    db.delete(like)
    db.commit()

    return {"message": "Page unliked", "liked": False}


@router.get("/pages/{page_id}/likes")
def get_page_likes(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get like count and whether current user liked the page"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    like_count = db.query(PageLike).filter(PageLike.page_id == page_id).count()
    user_liked = db.query(PageLike).filter(
        PageLike.page_id == page_id,
        PageLike.user_id == current_user.id
    ).first() is not None

    return {
        "page_id": page_id,
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


@router.get("/pages/popular")
def get_popular_pages(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    limit: int = 5
):
    """Get most popular pages by like count"""
    from sqlalchemy import or_
    from app.models.collaborator import PageCollaborator

    # Get accessible pages
    if current_user is None:
        # Guest: only public pages
        accessible_pages = db.query(Page).filter(Page.is_public == True).all()
    elif current_user.role == "admin":
        accessible_pages = db.query(Page).all()
    else:
        collaborator_page_ids = db.query(PageCollaborator.page_id).filter(
            PageCollaborator.user_id == current_user.id
        ).subquery()
        
        accessible_pages = db.query(Page).filter(
            or_(
                Page.is_public == True,
                Page.author_id == current_user.id,
                Page.id.in_(db.query(collaborator_page_ids.c.page_id))
            )
        ).all()

    accessible_page_ids = {p.id for p in accessible_pages}

    if not accessible_page_ids:
        return []

    # Get pages with like counts
    popular_pages = db.query(
        Page,
        func.count(PageLike.id).label('like_count')
    ).outerjoin(
        PageLike, Page.id == PageLike.page_id
    ).filter(
        Page.id.in_(accessible_page_ids)
    ).group_by(
        Page.id
    ).order_by(
        func.count(PageLike.id).desc(),
        Page.created_at.desc()
    ).limit(limit).all()

    result = []
    for page, like_count in popular_pages:
        page_dict = page.to_dict()
        page_dict['like_count'] = like_count or 0
        result.append(page_dict)

    return result

