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
COPY requirements.txt requirements-server.txt ./
COPY voiceguard_addon/export-requirements.txt ./voiceguard_addon/export-requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements-server.txt && \
    python -m venv --system-site-packages /opt/voiceguard-inference && \
    /opt/voiceguard-inference/bin/python -c "import torch, transformers, safetensors; import json; from pathlib import Path; Path('/opt/voiceguard-inference/ready.json').write_text(json.dumps({'torch':torch.__version__,'transformers':transformers.__version__}))"

# Copy backend code, models, and CLI
COPY backend/ ./backend/
COPY voiceguard_addon/ ./voiceguard_addon/
COPY dataset/ ./dataset/
COPY detect_voice.py backend.py backend_with_pella_nii.py evaluate.py index.html style.css voiceguard.js config.js firebase-config.js ./

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data /app/cache /app/voiceguard_addon/weights /app/voiceguard_addon/recovery && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0
ENV VOICEGUARD_INFERENCE_PYTHON=/opt/voiceguard-inference/bin/python
ENV VOICEGUARD_EXPORT_PYTHON=/usr/local/bin/python
ENV VOICEGUARD_DB_PATH=/app/data/voiceguard.sqlite3
ENV HF_HOME=/app/cache/huggingface
ENV PYTHONDONTWRITEBYTECODE=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "backend_with_pella_nii.py"]
