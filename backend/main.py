from fastapi import FastAPI
from routes import router as api_router
import uvicorn

app = FastAPI(title="Krishi AI Backend")

# Include the API routes defined in routes.py
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "online", "service": "Krishi AI Backend", "version": "2.1.0"}

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
