import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend/api is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from routes.urls import router as urls_router

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Auto-create tables if they don't exist
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Table creation error: {e}")

app = FastAPI(title="URL Shortener API", version="1.0.0")

class VercelPathMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        orig_path = request.query_params.get("__path")
        if orig_path:
            request.scope["path"] = orig_path
        return await call_next(request)

app.add_middleware(VercelPathMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}


frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))

@app.get("/api/index.py")
def debug_root(request: Request):
    return {
        "headers": dict(request.headers),
        "url": str(request.url),
        "scope_path": request.scope.get("path"),
    }

@app.post("/api/index.py")
def debug_root_post(request: Request):
    return {
        "headers": dict(request.headers),
        "url": str(request.url),
        "scope_path": request.scope.get("path"),
    }



# Serve frontend directly from FastAPI root
if os.path.exists(frontend_dir):
    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/style.css")
    def serve_css():
        return FileResponse(os.path.join(frontend_dir, "style.css"), media_type="text/css")

    @app.get("/app.js")
    def serve_js():
        return FileResponse(os.path.join(frontend_dir, "app.js"), media_type="application/javascript")

# Wildcard redirect and API routes
app.include_router(urls_router)