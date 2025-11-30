from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.models.page_version import PageVersion
from app.models.collaborator import PageCollaborator
from app.schemas.page import PageCreate, PageUpdate
from app.schemas.collaborator import CollaboratorCreate
from app.core.security import get_current_user, decode_access_token
from typing import List, Optional

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


@router.get("/")
def get_pages(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get pages in tree structure. For guests: only public pages. For users: accessible pages."""
    from sqlalchemy import or_
    
    if current_user is None:
        # Guest: only public pages and their children
        public_pages = db.query(Page).filter(Page.is_public == True).all()
        public_page_ids = {p.id for p in public_pages}
        
        # Recursively include all children of public pages
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
    elif current_user.role == "admin":
        # Admin: all pages
        pages = db.query(Page).all()
    else:
        # User: public pages, own pages, and pages where user is collaborator
        # Get page IDs where user is collaborator
        collaborator_page_ids = db.query(PageCollaborator.page_id).filter(
            PageCollaborator.user_id == current_user.id
        ).subquery()
        
        # Get accessible pages
        accessible_pages = db.query(Page).filter(
            or_(
                Page.is_public == True,
                Page.author_id == current_user.id,
                Page.id.in_(db.query(collaborator_page_ids.c.page_id))
            )
        ).all()
        
        # Also include child pages of accessible pages (even if child itself is not directly accessible)
        accessible_page_ids = {p.id for p in accessible_pages}
        child_pages = db.query(Page).filter(
            Page.parent_id.in_(accessible_page_ids)
        ).all()
        
        # Combine and remove duplicates by ID
        all_page_ids = accessible_page_ids.copy()
        for child in child_pages:
            all_page_ids.add(child.id)
        
        # Also recursively include grandchildren, etc.
        # Keep adding children until no new ones are found
        while True:
            new_child_pages = db.query(Page).filter(
                Page.parent_id.in_(all_page_ids),
                ~Page.id.in_(all_page_ids)
            ).all()
            if not new_child_pages:
                break
            for child in new_child_pages:
                all_page_ids.add(child.id)
        
        # Get all pages by IDs
        pages = db.query(Page).filter(Page.id.in_(all_page_ids)).all()

    # Build tree structure - only show root pages (parent_id is None)
    # Include like counts in tree
    user_id = current_user.id if current_user else None
    def build_tree_with_likes(pages_list, parent_id=None):
        tree = []
        for page in pages_list:
            if page.parent_id == parent_id:
                node = page.to_dict(include_like_count=True, db=db, user_id=user_id)
                node["children"] = build_tree_with_likes(pages_list, page.id)
                tree.append(node)
        return tree
    
    tree = build_tree_with_likes(pages, None)
    return tree


@router.get("/{page_id}")
def get_page(
    page_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_access_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    user_id = current_user.id if current_user else None
    return page.to_dict(include_like_count=True, db=db, user_id=user_id)


@router.post("/")
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
    page_id: int,
    page: PageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_page = db.query(Page).filter(Page.id == page_id).first()
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
        while db.query(Page).filter(Page.slug == new_slug, Page.id != page_id).first():
            new_slug = f"{base_slug}-{counter}"
            counter += 1
        db_page.slug = new_slug

    db.commit()
    db.refresh(db_page)

    return db_page.to_dict()


@router.delete("/{page_id}")
def delete_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_page = db.query(Page).filter(Page.id == page_id).first()
    if not db_page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Only author or admin can delete
    if db_page.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this page")

    db.delete(db_page)
    db.commit()

    return {"message": "Page deleted successfully"}


@router.get("/{page_id}/history")
def get_page_history(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_access_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    versions = db.query(PageVersion).filter(
        PageVersion.page_id == page_id
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
    page_id: int,
    version_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = db.query(Page).filter(Page.id == page_id).first()
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


@router.get("/{page_id}/collaborators")
def get_collaborators(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not can_edit_page(page, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    collaborators = db.query(PageCollaborator).filter(
        PageCollaborator.page_id == page_id
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
    page_id: int,
    collaborator_data: CollaboratorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    page = db.query(Page).filter(Page.id == page_id).first()
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
        PageCollaborator.page_id == page_id,
        PageCollaborator.user_id == collaborator_data.user_id
    ).first()

    if existing:
        existing.access_level = collaborator_data.access_level
        db.commit()
        return {"message": "Collaborator access updated"}

    # Create new collaborator
    collaborator = PageCollaborator(
        page_id=page_id,
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