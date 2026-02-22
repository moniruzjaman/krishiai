"""
Text-to-Speech API Router.

This module provides the FastAPI router for TTS endpoints.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from ..services.tts_service import (
    generate_speech,
    TTSError,
    MAX_TEXT_LENGTH
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/tts", tags=["Text-to-Speech"])


# Request/Response Models
class TTSRequest(BaseModel):
    """Request model for TTS endpoint."""
    text: str = Field(
        ...,
        description="The text to convert to speech",
        min_length=1,
        max_length=MAX_TEXT_LENGTH
    )
    
    @field_validator('text')
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        """Validate that text is not empty or whitespace only."""
        if not v or not v.strip():
            raise ValueError('Text cannot be empty or whitespace only')
        return v


class TTSSuccessResponse(BaseModel):
    """Success response model for TTS endpoint."""
    audio: str = Field(
        ...,
        description="Base64-encoded PCM audio data (24kHz, mono)"
    )
    success: bool = Field(
        default=True,
        description="Indicates successful TTS generation"
    )


class TTSErrorResponse(BaseModel):
    """Error response model for TTS endpoint."""
    error: str = Field(
        ...,
        description="Error message"
    )
    success: bool = Field(
        default=False,
        description="Indicates failed TTS generation"
    )
    error_code: Optional[str] = Field(
        default=None,
        description="Error code for programmatic handling"
    )


@router.post(
    "",
    response_model=TTSSuccessResponse,
    responses={
        400: {"model": TTSErrorResponse, "description": "Invalid input"},
        500: {"model": TTSErrorResponse, "description": "TTS generation failed"},
        503: {"model": TTSErrorResponse, "description": "Service unavailable (API key missing)"}
    },
    summary="Convert text to speech",
    description=f"""
    Convert text to speech using Google Gemini TTS API.
    
    - **text**: The text to convert (max {MAX_TEXT_LENGTH} characters)
    - Returns base64-encoded PCM audio (24kHz sample rate, mono)
    - Markdown characters (*#_~`) are automatically removed from the text
    
    The audio can be played by:
    1. Decoding the base64 string to bytes
    2. Creating an AudioContext with 24000Hz sample rate
    3. Playing the PCM data through the audio context
    """
)
async def text_to_speech(request: TTSRequest) -> TTSSuccessResponse:
    """
    Convert text to speech using Google Gemini TTS API.
    
    Args:
        request: TTSRequest containing the text to convert
        
    Returns:
        TTSSuccessResponse with base64-encoded audio data
        
    Raises:
        HTTPException: If TTS generation fails
    """
    try:
        logger.info(f"TTS request received for {len(request.text)} characters")
        
        # Generate speech
        audio_base64 = await generate_speech(request.text)
        
        logger.info("TTS generation successful")
        
        return TTSSuccessResponse(
            audio=audio_base64,
            success=True
        )
        
    except TTSError as e:
        logger.error(f"TTS error: {e.message} (code: {e.error_code})")
        
        # Map error codes to HTTP status codes
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        
        if e.error_code == "INVALID_INPUT":
            status_code = status.HTTP_400_BAD_REQUEST
        elif e.error_code == "MISSING_API_KEY":
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif e.error_code == "MISSING_SDK":
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
        raise HTTPException(
            status_code=status_code,
            detail=TTSErrorResponse(
                error=e.message,
                success=False,
                error_code=e.error_code
            ).model_dump()
        )
        
    except Exception as e:
        logger.error(f"Unexpected error during TTS: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=TTSErrorResponse(
                error=f"An unexpected error occurred: {str(e)}",
                success=False,
                error_code="INTERNAL_ERROR"
            ).model_dump()
        )


# Health check endpoint for TTS service
@router.get(
    "/health",
    summary="Check TTS service health",
    description="Returns the health status of the TTS service"
)
async def health_check():
    """
    Health check endpoint for the TTS service.
    
    Returns:
        Health status of the TTS service
    """
    import os
    
    api_key_configured = bool(os.environ.get("GEMINI_API_KEY"))
    
    return {
        "status": "healthy" if api_key_configured else "degraded",
        "service": "tts",
        "api_key_configured": api_key_configured,
        "model": "gemini-2.5-flash-preview-tts",
        "voice": "Kore"
    }
