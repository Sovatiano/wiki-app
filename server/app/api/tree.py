from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.core.security import get_current_user
from typing import List, Dict, Any

router = APIRouter()


def build_page_tree(pages: List[Page], parent_id: int = None) -> List[Dict[str, Any]]:
    """Build a tree structure from flat pages list"""
    tree = []
    for page in pages:
        if page.parent_id == parent_id:
            node = page.to_dict()
            node["children"] = build_page_tree(pages, page.id)
            tree.append(node)
    return tree


@router.get("/pages/tree")
def get_pages_tree(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get all pages in tree structure"""
    # Get public pages or all pages accessible to the user
    if current_user.role == "admin":
        pages = db.query(Page).all()
    else:
        pages = db.query(Page).filter(
            (Page.is_public == True) | (Page.author_id == current_user.id)
        ).all()

    tree = build_page_tree(pages)
    return tree