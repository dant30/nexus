"""
ASGI application entry point for FastAPI.
Used by production servers like Gunicorn + Uvicorn.
"""
from fastapi_app.main import app

# For Gunicorn + Uvicorn workers
asgi_app = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
