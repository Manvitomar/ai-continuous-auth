import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
import app.models # Ensure models are loaded

# Include API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.biometric import router as biometric_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.mfa import router as mfa_router
from app.api.v1.actions import router as actions_router

# Create SQLite Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Academic AI-Based Continuous Authentication System using Behavioral Biometrics (Keystroke dynamics, Mouse Kinematics, and Isolation Forest Anomaly Detection)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(biometric_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(mfa_router, prefix=settings.API_V1_STR)
app.include_router(actions_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "engine": "FastAPI + SQLite + IsolationForest"}

# ==================== Unified Static Frontend Serving ====================
# Search for built React dist files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "static"),
    os.path.join(BASE_DIR, "frontend", "dist"),
]

SERVE_DIR = None
for p in CANDIDATE_PATHS:
    if os.path.exists(p) and os.path.exists(os.path.join(p, "index.html")):
        SERVE_DIR = p
        break

if SERVE_DIR:
    # Mount assets folder
    assets_path = os.path.join(SERVE_DIR, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_app(full_path: str):
        # Allow API or docs requests through without intercepting
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return FileResponse(os.path.join(SERVE_DIR, "index.html"))

        # If a specific static asset exists (e.g. favicon.ico)
        target = os.path.join(SERVE_DIR, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)

        # Single Page Application fallback
        return FileResponse(os.path.join(SERVE_DIR, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "project": settings.PROJECT_NAME,
            "status": "OPERATIONAL",
            "version": "1.0.0",
            "docs": "/docs",
            "privacy": "Zero-Content Behavioral Biometrics"
        }
