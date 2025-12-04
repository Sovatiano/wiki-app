from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from app.core import config
from app.api import auth, users, pages, search, likes
import logging

app = FastAPI(
    title=config.settings.APP_NAME,
    description="API for a collaborative note-taking application",
    version="1.0.0",
    redirect_slashes=False  # Disable automatic redirects with trailing slashes
)

# Custom middleware to add CORS headers to all responses
class CORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Handle OPTIONS preflight requests
        if request.method == "OPTIONS":
            origin = request.headers.get("origin")
            allowed_origins = config.settings.CORS_ORIGINS
            if isinstance(allowed_origins, str):
                allowed_origins = [allowed_origins]
            
            cors_origin = "*"
            if origin and origin in allowed_origins:
                cors_origin = origin
            elif allowed_origins:
                cors_origin = allowed_origins[0]
            
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": cors_origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "3600",
                }
            )
        
        response = await call_next(request)
        # Get origin from request
        origin = request.headers.get("origin")
        # Check if origin is allowed
        allowed_origins = config.settings.CORS_ORIGINS
        if isinstance(allowed_origins, str):
            allowed_origins = [allowed_origins]
        
        if origin and origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        elif allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"
        return response

# Add custom CORS middleware first
app.add_middleware(CORSHeaderMiddleware)

# Also add standard CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Register pages endpoints directly BEFORE including router to avoid conflicts
from app.api.pages import get_pages, create_page, get_my_pages
from app.api.pages import get_current_user_optional as pages_get_current_user_optional
from app.core.security import get_current_user
from app.schemas.page import PageCreate
from app.database import get_db
from fastapi import Query, Depends
from typing import Optional
from app.models.user import User

# Register GET /api/pages endpoint - register BEFORE router to avoid conflicts
@app.api_route("/api/pages", methods=["GET"], tags=["pages"])
@app.api_route("/api/pages/", methods=["GET"], tags=["pages"])
def get_pages_endpoint(
    current_user: Optional[User] = Depends(pages_get_current_user_optional),
    db = Depends(get_db),
    my_only: bool = Query(False, description="Return only pages created by current user")
):
    logging.info(f"GET /api/pages called, my_only={my_only}")
    return get_pages(current_user, db, my_only)

# Register POST /api/pages endpoint
@app.api_route("/api/pages", methods=["POST"], tags=["pages"])
@app.api_route("/api/pages/", methods=["POST"], tags=["pages"])
def create_page_endpoint(
    page: PageCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    logging.info("POST /api/pages called")
    return create_page(page, current_user, db)

# Register GET /api/my-pages endpoint - separate path to avoid route conflicts
@app.api_route("/api/my-pages", methods=["GET"], tags=["pages"])
@app.api_route("/api/my-pages/", methods=["GET"], tags=["pages"])
def get_my_pages_endpoint(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    logging.info("GET /api/my-pages called")
    return get_my_pages(current_user, db)

# Include pages router for other endpoints (/{page_id}, etc.) - AFTER direct routes
logging.info(f"Registering pages router with prefix /api/pages")
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])

# Register search endpoint directly to avoid trailing slash issues
from app.api.search import search_pages, get_current_user_optional as search_get_current_user_optional

# Create wrapper for search endpoint
def search_pages_wrapper(
    q: str = Query(..., min_length=1),
    current_user = Depends(search_get_current_user_optional),
    db = Depends(get_db)
):
    try:
        return search_pages(q, current_user, db)
    except Exception as e:
        logging.error(f"Error in search_pages_wrapper: {e}", exc_info=True)
        raise

app.add_api_route("/api/search", search_pages_wrapper, methods=["GET"], tags=["search"])
app.add_api_route("/api/search/", search_pages_wrapper, methods=["GET"], tags=["search"])
app.include_router(likes.router, prefix="/api", tags=["likes"])

@app.get("/")
async def root():
    return {"message": "Welcome to WikiApp API"}

@app.get("/api")
async def api_root():
    return {
        "message": "WikiApp API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "users": "/api/users",
            "pages": "/api/pages",
            "search": "/api/search",
            "likes": "/api/pages/{page_id}/like"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add exception handlers to ensure CORS headers are included in error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logging.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
    origin = request.headers.get("origin")
    allowed_origins = config.settings.CORS_ORIGINS
    if isinstance(allowed_origins, str):
        allowed_origins = [allowed_origins]
    
    cors_origin = "*"
    if origin and origin in allowed_origins:
        cors_origin = origin
    elif allowed_origins:
        cors_origin = allowed_origins[0]
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error: {exc.errors()}")
    origin = request.headers.get("origin")
    allowed_origins = config.settings.CORS_ORIGINS
    if isinstance(allowed_origins, str):
        allowed_origins = [allowed_origins]
    
    cors_origin = "*"
    if origin and origin in allowed_origins:
        cors_origin = origin
    elif allowed_origins:
        cors_origin = allowed_origins[0]
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    allowed_origins = config.settings.CORS_ORIGINS
    if isinstance(allowed_origins, str):
        allowed_origins = [allowed_origins]
    
    cors_origin = "*"
    if origin and origin in allowed_origins:
        cors_origin = origin
    elif allowed_origins:
        cors_origin = allowed_origins[0]
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )