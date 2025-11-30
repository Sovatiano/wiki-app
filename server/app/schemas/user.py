from pydantic import BaseModel, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    username: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"
    is_active: bool = True

class User(UserBase):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)