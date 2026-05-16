"""
Krishi AI Backend - Main FastAPI Application.

This module sets up the FastAPI application with all routes and middleware.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .routes import tts_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Application metadata
APP_NAME = os.environ.get("APP_NAME", "Krishi AI Backend")
APP_VERSION = os.environ.get("APP_VERSION", "4.0.0")
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"

# CORS settings - Production and development origins
DEFAULT_ORIGINS = [
    # Development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4173",
    # Production
    "https://www.krishiai.live",
    "https://krishiai.live",
]

# Get additional origins from environment and combine with defaults
env_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else []
ALLOWED_ORIGINS: List[str] = DEFAULT_ORIGINS + [origin.strip() for origin in env_origins if origin.strip()]

# Note: For Vercel preview deployments, the ALLOWED_ORIGINS env variable should include
# patterns like "https://krishiai-*.vercel.app" - these need to be handled by the CORS middleware
# or use a custom origin validator for wildcard matching


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Debug mode: {DEBUG}")
    logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")
    
    # Check for required environment variables
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        logger.warning("GEMINI_API_KEY environment variable is not set - TTS will not work")
    else:
        logger.info("GEMINI_API_KEY is configured")
    
    yield
    
    # Shutdown
    logger.info(f"Shutting down {APP_NAME}")


# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    description="""
    Krishi AI Backend API - Agricultural AI Assistant
    
    ## Features
    
    * **Text-to-Speech (TTS)**: Convert text to speech using Google Gemini TTS API
      * Model: gemini-2.5-flash-preview-tts
      * Voice: Kore (prebuilt)
      * Audio format: PCM (24kHz, mono)
      * Max text length: 1000 characters
    
    ## Authentication
    
    Currently, the API does not require authentication. In production, you should
    implement appropriate authentication mechanisms.
    """,
    version=APP_VERSION,
    debug=DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with a consistent response format."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "success": False,
            "details": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors with a consistent response format."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected error occurred",
            "success": False,
            "details": str(exc) if DEBUG else "Internal server error"
        }
    )


# Include routers
app.include_router(tts_router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - Returns API information.
    """
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "tts": "/api/tts",
            "tts_health": "/api/tts/health"
        }
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health():
    """
    Health check endpoint - Returns the health status of the API.
    """
    return {
        "status": "healthy",
        "name": APP_NAME,
        "version": APP_VERSION
    }


# For running with uvicorn directly
if __name__ == "__main__":
    import uvicorn
    
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=DEBUG
    )
