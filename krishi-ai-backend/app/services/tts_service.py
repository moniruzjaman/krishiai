"""
Text-to-Speech Service using Google Gemini TTS API.

This module provides TTS functionality using the Gemini 2.5 Flash Preview TTS model.
It converts text input to PCM audio (24kHz, mono) and returns base64-encoded audio data.
"""

import os
import base64
import re
import logging
from typing import Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MAX_TEXT_LENGTH = 1000
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_VOICE = "Kore"
SAMPLE_RATE = 24000

# Markdown characters to remove for TTS
MARKDOWN_PATTERN = re.compile(r'[*#_~`]'')


class TTSError(Exception):
    """Custom exception for TTS-related errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


def sanitize_text(text: str) -> str:
    """
    Sanitize text for TTS by removing markdown characters.
    
    Args:
        text: The input text to sanitize
        
    Returns:
        Sanitized text with markdown characters removed
    """
    # Remove markdown characters
    sanitized = MARKDOWN_PATTERN.sub('', text)
    # Remove extra whitespace
    sanitized = ' '.join(sanitized.split())
    return sanitized


def validate_text(text: str) -> Tuple[bool, Optional[str]]:
    """
    Validate text input for TTS.
    
    Args:
        text: The input text to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not text:
        return False, "Text input is required"
    
    if not isinstance(text, str):
        return False, "Text must be a string"
    
    if len(text) > MAX_TEXT_LENGTH:
        return False, f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters"
    
    if not text.strip():
        return False, "Text cannot be empty or whitespace only"
    
    return True, None


def get_gemini_client():
    """
    Get the Gemini client for TTS.
    
    Returns:
        Configured Gemini client
        
    Raises:
        TTSError: If API key is not configured or client initialization fails
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        raise TTSError(
            "GEMINI_API_KEY environment variable is not set",
            error_code="MISSING_API_KEY"
        )
    
    try:
        # Try the new google-genai SDK first
        from google import genai
        client = genai.Client(api_key=api_key)
        return client
    except ImportError:
        # Fall back to google-generativeai SDK
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            return genai
        except ImportError as e:
            raise TTSError(
                "Neither google-genai nor google-generativeai SDK is installed",
                error_code="MISSING_SDK"
            )


async def generate_speech(text: str) -> str:
    """
    Generate speech from text using Google Gemini TTS API.
    
    Args:
        text: The text to convert to speech (max 1000 characters)
        
    Returns:
        Base64-encoded PCM audio data (24kHz, mono)
        
    Raises:
        TTSError: If text validation fails or TTS generation fails
    """
    # Validate input
    is_valid, error_message = validate_text(text)
    if not is_valid:
        raise TTSError(error_message, error_code="INVALID_INPUT")
    
    # Sanitize text
    sanitized_text = sanitize_text(text)
    logger.info(f"Generating speech for text ({len(sanitized_text)} chars)")
    
    try:
        client = get_gemini_client()
        
        # Try using the new google-genai SDK
        try:
            from google import genai
            from google.genai import types
            
            # Configure TTS
            config = types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=TTS_VOICE
                        )
                    )
                )
            )
            
            # Generate speech
            response = client.models.generate_content(
                model=TTS_MODEL,
                contents=sanitized_text,
                config=config
            )
            
            # Extract audio data
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        audio_data = part.inline_data.data
                        # Encode to base64
                        if isinstance(audio_data, bytes):
                            return base64.b64encode(audio_data).decode('utf-8')
                        else:
                            return base64.b64encode(bytes(audio_data)).decode('utf-8')
            
            raise TTSError(
                "No audio data in TTS response",
                error_code="NO_AUDIO_DATA"
            )
            
        except ImportError:
            # Fall back to google-generativeai SDK
            import google.generativeai as genai
            
            # For the older SDK, we need to use a different approach
            # The TTS model may not be directly supported in the older SDK
            model = genai.GenerativeModel(TTS_MODEL)
            
            # Generate content with audio response
            response = await model.generate_content_async(
                sanitized_text,
                generation_config={
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": TTS_VOICE
                            }
                        }
                    }
                }
            )
            
            # Extract audio data from response
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            audio_data = part.inline_data.data
                            if isinstance(audio_data, bytes):
                                return base64.b64encode(audio_data).decode('utf-8')
                            else:
                                return base64.b64encode(bytes(audio_data)).decode('utf-8')
            
            raise TTSError(
                "No audio data in TTS response",
                error_code="NO_AUDIO_DATA"
            )
            
    except TTSError:
        raise
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        raise TTSError(
            f"Failed to generate speech: {str(e)}",
            error_code="TTS_GENERATION_FAILED"
        )


def generate_speech_sync(text: str) -> str:
    """
    Synchronous version of generate_speech for compatibility.
    
    Args:
        text: The text to convert to speech (max 1000 characters)
        
    Returns:
        Base64-encoded PCM audio data (24kHz, mono)
        
    Raises:
        TTSError: If text validation fails or TTS generation fails
    """
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        # If we're already in an async context, create a new thread
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, generate_speech(text))
            return future.result()
    else:
        return loop.run_until_complete(generate_speech(text))


# For backward compatibility and direct imports
__all__ = [
    'generate_speech',
    'generate_speech_sync',
    'sanitize_text',
    'validate_text',
    'TTSError',
    'MAX_TEXT_LENGTH',
    'TTS_MODEL',
    'TTS_VOICE',
    'SAMPLE_RATE'
]
