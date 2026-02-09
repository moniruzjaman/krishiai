"""
Vercel Serverless Function Entry Point
This file serves as the entry point for Vercel serverless deployment
"""

import sys
import os

os.environ["ENVIRONMENT"] = "production"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

handler = app
