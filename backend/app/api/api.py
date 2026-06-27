from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.content import router as content_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.health import router as health_router
from app.api.routes.progress import router as progress_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(progress_router)
api_router.include_router(feedback_router)
