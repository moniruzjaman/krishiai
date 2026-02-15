from fastapi import FastAPI, HTTPException
from routes import router as api_router
import uvicorn
import os

app = FastAPI(
    title="Krishi AI Backend",
    description="AI-powered agricultural platform for Bangladeshi farmers",
    version="2.1.0"
)

# Include the API routes defined in routes.py
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Krishi AI Backend",
        "version": "2.1.0",
        "description": "AI-powered agricultural platform for Bangladeshi farmers"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Krishi AI Backend"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
