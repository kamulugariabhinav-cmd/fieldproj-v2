"""
VoiceGuard CLI
# Command-line interface - Real AI Voice Deepfake Detection
=================================================
Runs genuine pretrained AASIST-L / AASIST deepfake inference on local audio files.
Usage:
    python detect_voice.py <audio_file> [--threshold 0.5] [--model AASIST-L]
"""

import sys
import argparse
from pathlib import Path

# Add repo root to python path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.detector import VoiceGuardDetector
from backend.audio_processor import AudioProcessingError


def main():
    parser = argparse.ArgumentParser(description="VoiceGuard AI Voice Deepfake Detector CLI")
    parser.add_argument("audio_path", help="Path to audio file (WAV, MP3, FLAC, M4A, WebM, OGG)")
    parser.add_argument("--threshold", "-t", type=float, default=0.50, help="Spoof detection threshold (0.0 - 1.0)")
    parser.add_argument("--model", "-m", choices=["AASIST-L", "AASIST"], default="AASIST-L", help="Pretrained model")
    args = parser.parse_args()

    file_path = Path(args.audio_path)
    if not file_path.exists():
        print(f"Error: Audio file not found at '{args.audio_path}'")
        sys.exit(1)

    print(f"[*] VoiceGuard analyzing: {file_path.name}")
    print(f"[*] Loading model: {args.model}")

    try:
        detector = VoiceGuardDetector.get_instance(args.model)
        content = file_path.read_bytes()
        res = detector.detect(content, filename=file_path.name, threshold=args.threshold)

        print("\n" + "=" * 50)
        print("          VOICEGUARD DETECTION REPORT")
        print("=" * 50)
        print(f"  Audio File       : {file_path.name}")
        print(f"  Duration         : {res['audio_duration_seconds']}s")
        print(f"  Prediction       : {res['prediction']}")
        print(f"  Risk Level       : {res['risk_level']}")
        print(f"  Spoof Score      : {res['model_score']:.4f} (Threshold: {res['threshold_used']})")
        print(f"  Inference Time   : {res['inference_time_ms']} ms")
        print(f"  Total Time       : {res['total_processing_time_ms']} ms")
        print(f"  Windows Analyzed : {res['windows_analyzed']}")
        print(f"  Model            : {res['model_name']} ({res['device']})")
        print("-" * 50)
        print(f"  Assessment       : {res['message']}")
        print("=" * 50)

        if res["windows_analyzed"] > 1:
            print("\n  Window Breakdown:")
            for w in res["window_details"]:
                print(f"    [{w['start_seconds']:5.2f}s - {w['end_seconds']:5.2f}s] Spoof: {w['spoof_score']:.4f} (logit: {w['spoof_logit']:+.2f})")
        print("")

    except AudioProcessingError as ape:
        print(f"\nAudio Processing Error [{ape.code}]: {ape.message}")
        sys.exit(2)
    except Exception as e:
        print(f"\nInference Error: {e}")
        sys.exit(3)


if __name__ == "__main__":
    main()
