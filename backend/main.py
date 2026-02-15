import uvicorn
from fastapi import FastAPI
from routes_hybrid import router as api_router

app = FastAPI(title="Krishi AI Backend - Hybrid")

# Include the API routes defined in routes_hybrid.py
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Krishi AI Backend - Hybrid",
        "version": "3.0.0",
    }


if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
