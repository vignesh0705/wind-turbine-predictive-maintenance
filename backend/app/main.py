import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.config.paths import ensure_storage_dirs
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.database.indexes import create_indexes
from app.ml.model_manager import model_manager

# Import API routers
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.api.inference import router as inference_router
from app.api.dashboard import router as dashboard_router
from app.api.turbines import router as turbines_router
from app.api.alerts import router as alerts_router
from app.api.explainability import router as explainability_router
from app.api.weather import router as weather_router

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("wind_turbine_ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initialize storage, MongoDB, indexes, and load ML models on startup."""
    logger.info(f"Initializing {settings.APP_NAME} ({settings.APP_ENV})...")

    # 1. Ensure storage directories exist
    ensure_storage_dirs()

    # 2. Connect to MongoDB and build indexes
    await connect_to_mongo()
    await create_indexes()

    # 3. Load all ML models and configuration files into memory
    model_manager.load_models()

    logger.info("Application startup sequence completed successfully.")
    yield

    # Shutdown sequence
    logger.info("Application shutdown sequence initiated...")
    await close_mongo_connection()
    logger.info("Application shutdown completed.")


# FastAPI Application Factory
app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Edge-Based Predictive Maintenance and Performance Optimization Framework for Wind Turbines Using Machine Learning",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS with explicit origins and localhost/127.0.0.1 regex support
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root welcome endpoint
@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint providing links to documentation and health status."""
    return {
        "message": "Wind Turbine AI Backend is running successfully!",
        "service": settings.APP_NAME,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/health",
    }


# Health check endpoints
@app.get("/health", tags=["Health"])
async def root_health():
    """Service health verification endpoint."""
    return {
        "status": "ok",
        "service": "wind-turbine-ai-backend",
    }


@app.get("/api/health", tags=["Health"])
async def api_health():
    """API health verification endpoint for frontend health checks."""
    return {
        "status": "ok",
        "service": "wind-turbine-ai-backend",
    }


# Register API Routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(datasets_router, prefix="/api")
app.include_router(inference_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(turbines_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(explainability_router, prefix="/api")
app.include_router(weather_router, prefix="/api")


# Global exception handler for uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the administrator."},
    )
