"""
VoiceGuard Backend Server
=========================
Entry point to run the VoiceGuard API server using Uvicorn.
Usage:
    python backend.py
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting VoiceGuard AI Deepfake Detection Backend on http://{host}:{port}")
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)
