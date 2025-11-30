from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin  # Добавьте UserLogin
from app.core import security

router = APIRouter()

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_password = security.get_password_hash(user.password)

    # Create user
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,  # Убедитесь, что в модели поле называется password_hash
        role=user.role,
        is_active=user.is_active
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"message": "User created successfully", "user_id": db_user.id}


@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):  # Используйте UserLogin вместо UserCreate
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not security.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Create access token
    access_token = security.create_access_token(data={"sub": db_user.username})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username
    }