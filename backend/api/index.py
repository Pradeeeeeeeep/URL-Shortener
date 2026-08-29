import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend/api is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from routes.urls import router as urls_router

# Auto-create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="URL Shortener API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(urls_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}