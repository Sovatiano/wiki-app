from pydantic import BaseModel
from typing import Optional

class CollaboratorCreate(BaseModel):
    user_id: int
    access_level: str  # 'read' or 'write'

class CollaboratorResponse(BaseModel):
    id: int
    user: dict
    access_level: str
    created_at: str

