"""
VoiceGuard Audio Preprocessing Pipeline
=======================================
Robust decoding, validation, mono-conversion, 16kHz resampling, silence detection,
and windowing for AASIST deepfake detection.
"""

import io
import math
from typing import List, Tuple, Dict, Any, Union
from pathlib import Path

import numpy as np
import soundfile as sf
import av

MODEL_SAMPLE_RATE = 16000
MODEL_WINDOW_SAMPLES = 64600  # ~4.0375 seconds at 16kHz
DEFAULT_HOP_SAMPLES = 32300   # 50% overlap (~2.0187 seconds)
MIN_DURATION_SECONDS = 0.5
MAX_DURATION_SECONDS = 300.0  # 5 minutes
SILENCE_RMS_THRESHOLD = 0.001 # RMS threshold for silence
SILENCE_PEAK_THRESHOLD = 0.005 # Peak amplitude threshold for silence


class AudioProcessingError(Exception):
    """Custom exception for audio preprocessing errors with explicit error codes."""
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _resample(waveform: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample 1D numpy array from orig_sr to target_sr using scipy/soxr."""
    if orig_sr == target_sr:
        return waveform
    try:
        import soxr
        return soxr.resample(waveform, orig_sr, target_sr)
    except ImportError:
        import scipy.signal
        gcd = math.gcd(orig_sr, target_sr)
        up = target_sr // gcd
        down = orig_sr // gcd
        return scipy.signal.resample_poly(waveform, up, down).astype(np.float32)


def decode_audio_bytes(audio_bytes: bytes, filename: str = "audio.wav") -> Tuple[np.ndarray, int, float, Dict[str, Any]]:
    """
    Decodes raw audio bytes from memory or file into a mono 16kHz float32 numpy array.
    Supports WAV, MP3, FLAC, M4A, WebM, OGG, AAC.
    """
    if not audio_bytes or len(audio_bytes) == 0:
        raise AudioProcessingError("EMPTY_FILE", "The uploaded audio file is empty (0 bytes).")

    waveform = None
    orig_sr = None
    orig_channels = 1

    # First strategy: try soundfile (fast for WAV, MP3, FLAC, OGG)
    try:
        data, sr = sf.read(io.BytesIO(audio_bytes), always_2d=False, dtype='float32')
        orig_sr = sr
        if data.ndim == 1:
            waveform = data
            orig_channels = 1
        else:
            orig_channels = data.shape[1]
            waveform = np.mean(data, axis=1)  # Convert stereo to mono
    except Exception:
        # Second strategy: Fallback to PyAV (robust for WebM/Opus, M4A/AAC, MP4, etc.)
        try:
            container = av.open(io.BytesIO(audio_bytes))
            audio_streams = [s for s in container.streams if s.type == 'audio']
            if not audio_streams:
                raise AudioProcessingError("NO_AUDIO_STREAM", "No audio stream found in the uploaded media container.")
            
            stream = audio_streams[0]
            orig_sr = stream.rate or 16000
            orig_channels = stream.channels or 1

            pcm_frames = []
            for frame in container.decode(stream):
                arr = frame.to_ndarray()
                if arr.ndim > 1:
                    arr = np.mean(arr, axis=0)
                pcm_frames.append(arr.astype(np.float32))

            container.close()

            if not pcm_frames:
                raise AudioProcessingError("EMPTY_AUDIO", "Audio container contains no decodable audio frames.")

            raw_waveform = np.concatenate(pcm_frames)
            
            # Normalize int formats to [-1.0, 1.0] if needed
            max_val = np.max(np.abs(raw_waveform))
            if max_val > 1.5:
                raw_waveform = raw_waveform / 32768.0

            waveform = raw_waveform.astype(np.float32)
        except AudioProcessingError:
            raise
        except Exception as pyav_err:
            raise AudioProcessingError("UNSUPPORTED_FORMAT", f"Could not decode audio: {str(pyav_err)}")

    if waveform is None or len(waveform) == 0:
        raise AudioProcessingError("EMPTY_AUDIO", "The decoded audio contains 0 audio samples.")

    # Resample to 16,000 Hz if needed
    if orig_sr != MODEL_SAMPLE_RATE:
        waveform = _resample(waveform, orig_sr, MODEL_SAMPLE_RATE)

    # Validate duration
    duration = len(waveform) / MODEL_SAMPLE_RATE
    if duration < MIN_DURATION_SECONDS:
        raise AudioProcessingError(
            "AUDIO_TOO_SHORT",
            f"Recording duration ({duration:.2f}s) is shorter than minimum required ({MIN_DURATION_SECONDS}s)."
        )
    if duration > MAX_DURATION_SECONDS:
        raise AudioProcessingError(
            "AUDIO_TOO_LONG",
            f"Recording duration ({duration:.2f}s) exceeds maximum allowed ({MAX_DURATION_SECONDS}s)."
        )

    # Detect silence / dead mic
    rms = float(np.sqrt(np.mean(waveform ** 2)))
    peak = float(np.max(np.abs(waveform)))
    if rms < SILENCE_RMS_THRESHOLD or peak < SILENCE_PEAK_THRESHOLD:
        raise AudioProcessingError(
            "SILENT_AUDIO",
            f"Recording appears silent or contains no detectable voice (RMS: {rms:.5f}, Peak: {peak:.5f}). Please speak closer to microphone."
        )

    # Sanitize NaN / Inf
    waveform = np.nan_to_num(waveform, nan=0.0, posinf=1.0, neginf=-1.0)

    stats = {
        "original_sample_rate": orig_sr,
        "target_sample_rate": MODEL_SAMPLE_RATE,
        "original_channels": orig_channels,
        "duration_seconds": round(duration, 3),
        "rms_energy": round(rms, 5),
        "peak_amplitude": round(peak, 5),
        "total_samples": len(waveform)
    }

    return waveform, MODEL_SAMPLE_RATE, duration, stats


def prepare_windows(waveform: np.ndarray,
                    window_samples: int = MODEL_WINDOW_SAMPLES,
                    hop_samples: int = DEFAULT_HOP_SAMPLES) -> List[Dict[str, Any]]:
    """
    Splits waveform into analysis windows for the AASIST model.
    - If shorter than window_samples, tile repeatedly (AASIST canonical pad).
    - If longer, slice into overlapping windows.
    Returns list of window dicts with window tensor and timestamps.
    """
    n_samples = len(waveform)
    windows = []

    if n_samples <= window_samples:
        # Tile repeatedly to reach window_samples
        num_repeats = int(window_samples / max(n_samples, 1)) + 1
        padded = np.tile(waveform, num_repeats)[:window_samples]
        windows.append({
            "index": 0,
            "start_seconds": 0.0,
            "end_seconds": round(n_samples / MODEL_SAMPLE_RATE, 3),
            "is_padded": True,
            "waveform": padded.astype(np.float32)
        })
    else:
        # Multiple windows
        idx = 0
        for start in range(0, n_samples - window_samples + 1, hop_samples):
            end = start + window_samples
            windows.append({
                "index": idx,
                "start_seconds": round(start / MODEL_SAMPLE_RATE, 3),
                "end_seconds": round(end / MODEL_SAMPLE_RATE, 3),
                "is_padded": False,
                "waveform": waveform[start:end].astype(np.float32)
            })
            idx += 1

        # Check if remaining tail segment is left uncovered (> 1 second)
        last_end_sample = (start if windows else 0) + window_samples
        if n_samples - last_end_sample > MODEL_SAMPLE_RATE * 1.0:
            tail_start = n_samples - window_samples
            windows.append({
                "index": idx,
                "start_seconds": round(tail_start / MODEL_SAMPLE_RATE, 3),
                "end_seconds": round(n_samples / MODEL_SAMPLE_RATE, 3),
                "is_padded": False,
                "waveform": waveform[tail_start:].astype(np.float32)
            })

    return windows
