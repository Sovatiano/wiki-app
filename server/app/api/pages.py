from fastapi import APIRouter, Depends, HTTPException, status, Security, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.models.page_version import PageVersion
from app.models.collaborator import PageCollaborator
from app.models.page_like import PageLike
from app.schemas.page import PageCreate, PageUpdate
from app.schemas.collaborator import CollaboratorCreate
from app.core.security import get_current_user, decode_access_token
from typing import List, Optional
from sqlalchemy import func

router = APIRouter()
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
            logging.warning("Failed to decode access token - token may be expired or invalid")
            return None
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            import logging
            logging.warning(f"User {username} not found in database")
            return None
        return user
    except Exception as e:
        # Log error for debugging but don't fail - allow guest access
        import logging
        logging.error(f"Error getting current user: {e}", exc_info=True)
        return None


def can_access_page(page: Page, user: Optional[User], db: Session) -> bool:
    """Check if user can access the page"""
    if page.is_public:
        return True
    if user is None:
        return False
    if user.role == "admin":
        return True
    if page.author_id == user.id:
        return True

    # Check if user is collaborator
    collaborator = db.query(PageCollaborator).filter(
        PageCollaborator.page_id == page.id,
        PageCollaborator.user_id == user.id
    ).first()

    return collaborator is not None


def can_edit_page(page: Page, user: Optional[User], db: Session) -> bool:
    """Check if user can edit the page"""
    if user is None:
        return False
    if user.role == "admin":
        return True
    if page.author_id == user.id:
        return True

    # Check if user is collaborator with write access
    collaborator = db.query(PageCollaborator).filter(
        PageCollaborator.page_id == page.id,
        PageCollaborator.user_id == user.id,
        PageCollaborator.access_level == 'write'
    ).first()

    return collaborator is not None


def build_page_tree(pages: List[Page], parent_id: Optional[int] = None) -> List[dict]:
    """Build a tree structure from flat pages list"""
    tree = []
    for page in pages:
        if page.parent_id == parent_id:
            node = page.to_dict()
            node["children"] = build_page_tree(pages, page.id)
            tree.append(node)
    return tree


def get_page_by_id_or_slug(page_id_or_slug: str, db: Session) -> Optional[Page]:
    """Get page by ID (int) or slug (str)"""
    try:
        page_id = int(page_id_or_slug)
        return db.query(Page).filter(Page.id == page_id).first()
    except ValueError:
        return db.query(Page).filter(Page.slug == page_id_or_slug).first()


# Moved to main.py to avoid route conflicts
def get_pages(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    my_only: bool = Query(False, description="Return only pages created by current user")
):
    """Get pages in tree structure. For guests: only public pages. For users: accessible pages."""
    from sqlalchemy import or_
    import logging
    
    # Debug logging
    if current_user:
        logging.info(f"Getting pages for user: {current_user.username} (role: {current_user.role})")
    else:
        logging.info("Getting pages for guest user")
    
    if current_user is None:
        # Guest: only public pages and their children
        public_pages = db.query(Page).filter(Page.is_public == True).all()
        public_page_ids = {p.id for p in public_pages}
        
        # Recursively include all children of public pages
        if public_page_ids:
            while True:
                child_pages = db.query(Page).filter(
                    Page.parent_id.in_(public_page_ids),
                    ~Page.id.in_(public_page_ids)
                ).all()
                if not child_pages:
                    break
                for child in child_pages:
                    public_page_ids.add(child.id)
            
            pages = db.query(Page).filter(Page.id.in_(public_page_ids)).all()
        else:
            pages = []
    elif current_user.role == "admin":
        # Admin: all pages
        from sqlalchemy.orm import joinedload
        pages = db.query(Page).options(joinedload(Page.author)).all()
    else:
        # User: public pages, own pages, and pages where user is collaborator
        try:
            # If my_only is True, return only pages created by current user
            if my_only:
                pages = db.query(Page).options(joinedload(Page.author)).filter(
                    Page.author_id == current_user.id
                ).all()
                logging.info(f"User {current_user.id} ({current_user.username}): found {len(pages)} own pages (my_only=True)")
            else:
                # Get page IDs where user is collaborator
                collaborator_page_ids_query = db.query(PageCollaborator.page_id).filter(
                    PageCollaborator.user_id == current_user.id
                )
                collaborator_page_ids = [row[0] for row in collaborator_page_ids_query.all()]
                
                # Get accessible pages - use simpler query
                # User should see: public pages OR own pages OR pages where user is collaborator
                access_conditions = [
                    Page.is_public == True,
                    Page.author_id == current_user.id
                ]
                
                # Add collaborator condition only if user has collaborations
                if collaborator_page_ids:
                    access_conditions.append(Page.id.in_(collaborator_page_ids))
                
                # Debug: check how many public pages exist
                public_count = db.query(Page).filter(Page.is_public == True).count()
                own_count = db.query(Page).filter(Page.author_id == current_user.id).count()
                logging.info(f"Debug - Public pages in DB: {public_count}, Own pages: {own_count}, Collaborator pages: {len(collaborator_page_ids)}")
                
                # Use joinedload to eagerly load author relationship
                from sqlalchemy.orm import joinedload
                accessible_pages = db.query(Page).options(joinedload(Page.author)).filter(
                    or_(*access_conditions)
                ).all()
                
                logging.info(f"User {current_user.id} ({current_user.username}): found {len(accessible_pages)} accessible pages (public: {sum(1 for p in accessible_pages if p.is_public)}, own: {sum(1 for p in accessible_pages if p.author_id == current_user.id)}, collaborators: {len(collaborator_page_ids)})")
                
                # Also include child pages of accessible pages (even if child itself is not directly accessible)
                accessible_page_ids = {p.id for p in accessible_pages}
                
                # Recursively include all children
                if accessible_page_ids:
                    while True:
                        child_pages = db.query(Page).filter(
                            Page.parent_id.in_(accessible_page_ids),
                            ~Page.id.in_(accessible_page_ids)
                        ).all()
                        if not child_pages:
                            break
                        for child in child_pages:
                            accessible_page_ids.add(child.id)
                    
                    # Get all pages by IDs with author relationship loaded
                    from sqlalchemy.orm import joinedload
                    pages = db.query(Page).options(joinedload(Page.author)).filter(Page.id.in_(accessible_page_ids)).all()
                    logging.info(f"After including children: {len(pages)} total pages for user {current_user.id}")
                else:
                    pages = []
                    logging.warning(f"No accessible pages found for user {current_user.id} ({current_user.username})")
        except Exception as e:
            logging.error(f"Error getting pages for user {current_user.id}: {e}", exc_info=True)
            # Fallback to empty list on error
            pages = []

    # Build tree structure - only show root pages (parent_id is None)
    # According to architecture: [{"id": "uuid", "title": "string", "children": [...], "is_public": bool}, ...]
    try:
        logging.info(f"Building tree from {len(pages)} pages")
        user_id = current_user.id if current_user else None
        def build_tree_with_likes(pages_list, parent_id=None):
            tree = []
            for page in pages_list:
                if page.parent_id == parent_id:
                    # Simplified structure for tree view
                    node = {
                        "id": page.id,
                        "title": page.title,
                        "is_public": page.is_public,
                        "author_id": page.author_id,
                        "children": build_tree_with_likes(pages_list, page.id)
                    }
                    # Debug: log author_id
                    logging.debug(f"Page {page.id} ({page.title}): author_id={page.author_id}")
                    # Add like count if available
                    try:
                        if db:
                            from app.models.page_like import PageLike
                            like_count = db.query(PageLike).filter(PageLike.page_id == page.id).count()
                            if like_count > 0:
                                node["like_count"] = like_count
                    except Exception as e:
                        logging.warning(f"Error getting like count for page {page.id}: {e}")
                    tree.append(node)
            return tree
        
        tree = build_tree_with_likes(pages, None)
        logging.info(f"Built tree with {len(tree)} root nodes from {len(pages)} total pages")
        
        # Debug: log page IDs and their parent_ids
        if pages:
            page_info = [(p.id, p.title[:30], p.parent_id) for p in pages[:10]]
            logging.info(f"Sample pages: {page_info}")
        
        return tree
    except Exception as e:
        logging.error(f"Error building page tree: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error building page tree: {str(e)}")


def get_my_pages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get only pages created by the current user in tree structure."""
    import logging
    from sqlalchemy.orm import joinedload
    
    logging.info(f"Getting own pages for user: {current_user.username} (id: {current_user.id})")
    
    # Get only pages created by current user
    pages = db.query(Page).options(joinedload(Page.author)).filter(
        Page.author_id == current_user.id
    ).all()
    
    logging.info(f"Found {len(pages)} pages created by user {current_user.id}")
    
    # Build tree structure - only show root pages (parent_id is None)
    try:
        def build_tree_with_likes(pages_list, parent_id=None):
            tree = []
            for page in pages_list:
                if page.parent_id == parent_id:
                    # Simplified structure for tree view
                    node = {
                        "id": page.id,
                        "title": page.title,
                        "is_public": page.is_public,
                        "author_id": page.author_id,
                        "children": build_tree_with_likes(pages_list, page.id)
                    }
                    # Add like count if available
                    try:
                        if db:
                            from app.models.page_like import PageLike
                            like_count = db.query(PageLike).filter(PageLike.page_id == page.id).count()
                            if like_count > 0:
                                node["like_count"] = like_count
                    except Exception as e:
                        logging.warning(f"Error getting like count for page {page.id}: {e}")
                    tree.append(node)
            return tree
        
        tree = build_tree_with_likes(pages, None)
        logging.info(f"Built tree with {len(tree)} root nodes from {len(pages)} total pages")
        
        return tree
    except Exception as e:
        logging.error(f"Error building page tree: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error building page tree: {str(e)}")


@router.get("/{page_id_or_slug}")
def get_page(
    page_id_or_slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    page = get_page_by_id_or_slug(page_id_or_slug, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_access_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    user_id = current_user.id if current_user else None
    return page.to_dict(include_like_count=True, db=db, user_id=user_id)


# Moved to main.py to avoid route conflicts
def create_page(page: PageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # If creating a child page, check permissions
    if page.parent_id:
        parent_page = db.query(Page).filter(Page.id == page.parent_id).first()
        if not parent_page:
            raise HTTPException(status_code=404, detail="Parent page not found")
        
        # Check if user can create child pages (must be author or write collaborator)
        if not can_edit_page(parent_page, current_user, db):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to create child pages for this page. Only the author or collaborators with write access can create child pages."
            )
    
    # Generate slug from title
    import re
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', page.title).lower().strip('-')

    # Ensure slug is unique
    counter = 1
    base_slug = slug
    while db.query(Page).filter(Page.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    db_page = Page(
        title=page.title,
        content=page.content,
        slug=slug,
        parent_id=page.parent_id,
        is_public=page.is_public,
        author_id=current_user.id
    )

    db.add(db_page)
    db.commit()
    db.refresh(db_page)

    return db_page.to_dict()


@router.put("/{page_id}")
def update_page(
    page_id: str,
    page: PageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_page = get_page_by_id_or_slug(page_id, db)
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_edit_page(db_page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to edit this page")

    # Create version before updating
    version = PageVersion(
        page_id=db_page.id,
        author_id=current_user.id,
        title=db_page.title,
        text=db_page.content or "",
        version_comment=getattr(page, 'version_comment', None)
    )
    db.add(version)

    # Update page
    db_page.title = page.title
    db_page.content = page.content
    # Only update is_public if it's explicitly provided (not None)
    if page.is_public is not None:
        db_page.is_public = page.is_public

    # Update slug if title changed
    import re
    new_slug = re.sub(r'[^a-zA-Z0-9]+', '-', page.title).lower().strip('-')
    if new_slug != db_page.slug:
        counter = 1
        base_slug = new_slug
        while db.query(Page).filter(Page.slug == new_slug, Page.id != db_page.id).first():
            new_slug = f"{base_slug}-{counter}"
            counter += 1
        db_page.slug = new_slug

    db.commit()
    db.refresh(db_page)

    return db_page.to_dict()


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_page = get_page_by_id_or_slug(page_id, db)
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Only author or admin can delete
    if db_page.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this page")

    db.delete(db_page)
    db.commit()

    return None


@router.get("/{page_id}/history")
def get_page_history(
    page_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # History requires read access (can_access_page checks read permissions)
    if not can_access_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    versions = db.query(PageVersion).filter(
        PageVersion.page_id == page.id
    ).order_by(PageVersion.created_at.desc()).all()

    return [
        {
            "id": v.id,
            "page_id": v.page_id,
            "author": {
                "id": v.author.id,
                "username": v.author.username
            },
            "title": v.title,
            "text": v.text,
            "version_comment": v.version_comment,
            "created_at": v.created_at.isoformat()
        }
        for v in versions
    ]


@router.post("/{page_id}/restore/{version_id}")
def restore_version(
    page_id: str,
    version_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_edit_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to edit this page")

    version = db.query(PageVersion).filter(
        PageVersion.id == version_id,
        PageVersion.page_id == page_id
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Create new version before restoring
    current_version = PageVersion(
        page_id=page.id,
        author_id=current_user.id,
        title=page.title,
        text=page.content or "",
        version_comment="Before restoring version"
    )
    db.add(current_version)

    # Restore version
    page.title = version.title
    page.content = version.text

    db.commit()
    db.refresh(page)

    return {"message": "Version restored", "page": page.to_dict()}


# Moved to main.py to avoid route conflicts
@router.get("/{page_id}/collaborators")
def get_collaborators(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_edit_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    collaborators = db.query(PageCollaborator).filter(
        PageCollaborator.page_id == page.id
    ).all()

    return [
        {
            "id": c.id,
            "user": {
                "id": c.user.id,
                "username": c.user.username,
                "email": c.user.email
            },
            "access_level": c.access_level,
            "created_at": c.created_at.isoformat()
        }
        for c in collaborators
    ]


@router.post("/{page_id}/collaborators")
def add_collaborator(
    page_id: str,
    collaborator_data: CollaboratorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = get_page_by_id_or_slug(page_id, db)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_edit_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    if collaborator_data.access_level not in ["read", "write"]:
        raise HTTPException(status_code=400, detail="access_level must be 'read' or 'write'")

    # Check if user exists
    user = db.query(User).filter(User.id == collaborator_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a collaborator
    existing = db.query(PageCollaborator).filter(
        PageCollaborator.page_id == page.id,
        PageCollaborator.user_id == collaborator_data.user_id
    ).first()

    if existing:
        existing.access_level = collaborator_data.access_level
        db.commit()
        return {"message": "Collaborator access updated"}

    # Create new collaborator
    collaborator = PageCollaborator(
        page_id=page.id,
        user_id=collaborator_data.user_id,
        access_level=collaborator_data.access_level
    )

    db.add(collaborator)
    db.commit()
    db.refresh(collaborator)

    return {"message": "Collaborator added", "collaborator": {
        "id": collaborator.id,
        "user": {
            "id": user.id,
            "username": user.username
        },
        "access_level": collaborator.access_level
    }}