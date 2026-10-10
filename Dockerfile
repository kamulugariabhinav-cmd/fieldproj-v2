# Production container image
# VoiceGuard AI Backend - Optimized Production Dockerfile
FROM python:3.11-slim

# Install system audio dependencies (libsndfile & ffmpeg libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code, models, and CLI
COPY backend/ ./backend/
COPY detect_voice.py backend.py evaluate.py ./

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0
ENV VOICEGUARD_MODEL=AASIST-L

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "backend.py"]
