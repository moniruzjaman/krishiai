import os
import sys

from app.main import app  # Import your FastAPI app


# This is the entry point that Vercel will use
def handler(event, context):
    # Vercel uses a different approach than traditional AWS Lambda
    # For FastAPI on Vercel, we just need to export the app instance
    pass


# Make sure the FastAPI app is available at the module level
# Vercel will automatically detect and serve the FastAPI app
