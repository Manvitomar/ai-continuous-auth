# Multi-Stage Production Dockerfile for Unified Continuous Auth Application

# ==================== Stage 1: Build React Frontend ====================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==================== Stage 2: Python Backend & Unified Server ====================
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt email-validator

# Copy backend application source
COPY backend/app ./app

# Copy built React frontend assets into app/static for direct serving
COPY --from=frontend-builder /app/frontend/dist ./app/static

# Create persistent storage folder for trained user models
RUN mkdir -p /app/app/storage/models

EXPOSE 8000

# Start server dynamically respecting cloud provider $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-${port:-10000}}"]
