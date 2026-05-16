"""
Routes package for the Krishiai backend API.
"""

from .tts import router as tts_router

__all__ = ['tts_router']
