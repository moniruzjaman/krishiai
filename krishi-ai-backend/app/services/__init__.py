"""
Krishi AI Backend Services Package.

This package contains service modules for various backend functionalities.
"""

from .tts_service import (
    generate_speech,
    generate_speech_sync,
    sanitize_text,
    validate_text,
    TTSError,
    MAX_TEXT_LENGTH,
    TTS_MODEL,
    TTS_VOICE,
    SAMPLE_RATE
)

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
