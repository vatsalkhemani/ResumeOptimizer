"""
Resume Optimizer Backend - FastAPI Application
"""
# Touch to trigger reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from app.routers import parse, render, analyze

app = FastAPI(
    title="Resume Optimizer API",
    description="API for parsing, analyzing, and rendering resumes",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(parse.router, prefix="/api", tags=["Parse"])
app.include_router(render.router, prefix="/api", tags=["Render"])
app.include_router(analyze.router, prefix="/api", tags=["Analyze"])


@app.get("/")
async def root():
    return {"message": "Resume Optimizer API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
