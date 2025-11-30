from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core import config
from app.api import auth, users, pages, search, likes

app = FastAPI(
    title=config.settings.APP_NAME,
    description="API for a collaborative note-taking application",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(likes.router, prefix="/api", tags=["likes"])

@app.get("/")
async def root():
    return {"message": "Welcome to WikiApp API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}