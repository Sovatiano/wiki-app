from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class PageBase(BaseModel):
    title: str
    content: str
    parent_id: Optional[int] = None
    is_public: bool = False

class PageCreate(PageBase):
    pass

class PageUpdate(BaseModel):
    title: str
    content: str
    version_comment: Optional[str] = None
    is_public: Optional[bool] = None

class Page(PageBase):
    id: int
    author_id: int
    slug: str
    created_at: datetime
    updated_at: datetime
    author: dict

    model_config = ConfigDict(from_attributes=True)

class PageTreeItem(Page):
    children: List['PageTreeItem'] = []

class PageVersion(BaseModel):
    id: int
    page_id: int
    author_id: int
    title: str
    text: str
    version_comment: Optional[str]
    created_at: datetime
    author: dict

    model_config = ConfigDict(from_attributes=True)

# Update forward reference
PageTreeItem.update_forward_refs()