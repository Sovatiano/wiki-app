from fastapi import APIRouter, Depends, HTTPException, status, Query, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.models.collaborator import PageCollaborator
from app.core.security import decode_access_token
from sqlalchemy import or_, text
from typing import Optional

router = APIRouter(redirect_slashes=False)
security = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None for guest access"""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        if not token:
            return None
        payload = decode_access_token(token)
        if payload is None:
            # Token is invalid - log but don't fail
            import logging
            logging.warning("Failed to decode access token in search - token may be expired or invalid")
            return None
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            import logging
            logging.warning(f"User {username} not found in database (search)")
            return None
        return user
    except Exception as e:
        # Log error for debugging but don't fail - allow guest access
        import logging
        logging.error(f"Error getting current user in search: {e}", exc_info=True)
        return None


@router.get("/")
def search_pages(
    q: str = Query(..., min_length=1),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Search pages. For guests: only public pages. For users: accessible pages."""
    import logging
    
    # Debug logging
    if current_user:
        logging.info(f"Search for user: {current_user.username} (role: {current_user.role}), query: {q}")
    else:
        logging.info(f"Search for guest user, query: {q}")
    
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
        try:
            collaborator_page_ids_query = db.query(PageCollaborator.page_id).filter(
                PageCollaborator.user_id == current_user.id
            )
            collaborator_page_ids = [row[0] for row in collaborator_page_ids_query.all()]
            
            # Build filter conditions
            access_filter = or_(
                Page.is_public == True,
                Page.author_id == current_user.id
            )
            
            # Add collaborator filter if user has any collaborations
            if collaborator_page_ids:
                access_filter = or_(
                    access_filter,
                    Page.id.in_(collaborator_page_ids)
                )
            
            # Use joinedload to eagerly load author relationship
            from sqlalchemy.orm import joinedload
            pages = db.query(Page).options(joinedload(Page.author)).filter(
                access_filter,
                or_(
                    Page.title.ilike(search_term),
                    Page.content.ilike(search_term)
                )
            ).limit(50).all()
        except Exception as e:
            logging.error(f"Error searching pages for user {current_user.id}: {e}", exc_info=True)
            # Fallback to empty list on error
            pages = []
    
    import logging
    logging.info(f"Found {len(pages)} pages for search query: {q}")

    # Format results with highlights
    results = []
    try:
        for page in pages:
            try:
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
                
                # Ensure author is loaded
                author_id = page.author_id
                author_username = "Unknown"
                if hasattr(page, 'author') and page.author:
                    author_id = page.author.id
                    author_username = page.author.username
                else:
                    # Fallback: query author if not loaded
                    from app.models.user import User
                    author = db.query(User).filter(User.id == page.author_id).first()
                    if author:
                        author_id = author.id
                        author_username = author.username
                
                results.append({
                    "page": {
                        "id": page.id,
                        "title": page.title,
                        "slug": page.slug,
                        "content": page.content,
                        "author": {
                            "id": author_id,
                            "username": author_username
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
            except Exception as e:
                logging.error(f"Error formatting page {page.id if page else 'unknown'}: {e}", exc_info=True)
                continue
        
        return results
    except Exception as e:
        logging.error(f"Error formatting search results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error formatting search results: {str(e)}")