"""
VoiceGuard Multi-Model Evaluation Pipeline
==========================================
Evaluates genuine pretrained anti-spoofing models on the labeled dataset.
Computes and reports:
- Accuracy, Precision, Recall, F1-Score
- ROC-AUC and Equal Error Rate (EER)
- Latency (mean, p50, p95 ms)
"""

import sys
import time
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Any

import numpy as np
from sklearn import metrics

# Add repo root to python path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.detector import VoiceGuardDetector
from backend.models.registry import MODEL_REGISTRY, get_model_status, ModelStatus


def compute_eer(bonafide_scores: np.ndarray, spoof_scores: np.ndarray) -> Tuple[float, float]:
    """Computes Equal Error Rate (EER) and operating threshold."""
    if len(bonafide_scores) == 0 or len(spoof_scores) == 0:
        return 0.0, 0.5

    y_true = np.concatenate([np.zeros(len(bonafide_scores)), np.ones(len(spoof_scores))])
    y_scores = np.concatenate([bonafide_scores, spoof_scores])

    fpr, tpr, thresholds = metrics.roc_curve(y_true, y_scores, pos_label=1)
    fnr = 1 - tpr

    idx = np.nanargmin(np.abs(fnr - fpr))
    eer = (fpr[idx] + fnr[idx]) / 2.0
    return float(eer), float(thresholds[idx])


def evaluate_single_model(model_name: str, dataset_dir: Path, threshold: float = 0.50):
    detector = VoiceGuardDetector.get_instance(model_name)
    bonafide_dir = dataset_dir / "bonafide"
    spoof_dir = dataset_dir / "spoof"

    bonafide_files = sorted(list(bonafide_dir.glob("*.wav")))
    spoof_files = sorted(list(spoof_dir.glob("*.wav")))

    if not bonafide_files and not spoof_files:
        print(f"No audio files found in {dataset_dir}")
        return

    print("=" * 65)
    print(f"        BENCHMARK: {model_name}")
    print("=" * 65)
    print(f"Dataset : {dataset_dir}")
    print(f"Samples : {len(bonafide_files)} genuine, {len(spoof_files)} spoof")
    print("-" * 65)

    y_true = []
    y_scores = []
    latencies = []

    # 1. Evaluate bonafide samples
    for f in bonafide_files:
        t0 = time.perf_counter()
        res = detector.detect(f.read_bytes(), filename=f.name, model_name=model_name, threshold=threshold)
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)
        y_true.append(0)
        y_scores.append(res["raw_score"])
        print(f"  [BONAFIDE] {f.name:18} -> Score: {res['raw_score']:.4f} | Verdict: {res['prediction']:18} | {lat:5.1f}ms")

    # 2. Evaluate spoof samples
    for f in spoof_files:
        t0 = time.perf_counter()
        res = detector.detect(f.read_bytes(), filename=f.name, model_name=model_name, threshold=threshold)
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)
        y_true.append(1)
        y_scores.append(res["raw_score"])
        print(f"  [SPOOF]    {f.name:18} -> Score: {res['raw_score']:.4f} | Verdict: {res['prediction']:18} | {lat:5.1f}ms")

    y_true = np.array(y_true)
    y_scores = np.array(y_scores)
    y_pred = (y_scores >= threshold).astype(int)

    acc = metrics.accuracy_score(y_true, y_pred)
    prec = metrics.precision_score(y_true, y_pred, zero_division=0)
    rec = metrics.recall_score(y_true, y_pred, zero_division=0)
    f1 = metrics.f1_score(y_true, y_pred, zero_division=0)

    try:
        auc = metrics.roc_auc_score(y_true, y_scores)
    except Exception:
        auc = 0.5

    bona_scores = y_scores[y_true == 0]
    spoof_scores = y_scores[y_true == 1]
    eer, eer_thresh = compute_eer(bona_scores, spoof_scores)

    print("-" * 65)
    print("                     METRICS SUMMARY")
    print("-" * 65)
    print(f"  Accuracy            : {acc*100:.2f}%")
    print(f"  Precision           : {prec*100:.2f}%")
    print(f"  Recall              : {rec*100:.2f}%")
    print(f"  F1 Score            : {f1:.4f}")
    print(f"  ROC-AUC             : {auc:.4f}")
    print(f"  Equal Error Rate    : {eer*100:.2f}% (at threshold {eer_thresh:.4f})")
    print(f"  Mean Latency        : {np.mean(latencies):.2f} ms")
    print(f"  Median Latency (p50): {np.median(latencies):.2f} ms")
    print(f"  p95 Latency         : {np.percentile(latencies, 95):.2f} ms")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description="Evaluate VoiceGuard models on audio dataset.")
    parser.add_argument("--model", type=str, default="AASIST-L", help="Model ID (or 'ALL' to test all ready models)")
    parser.add_argument("--threshold", type=float, default=0.50, help="Spoof decision threshold")
    parser.add_argument("--dataset-dir", type=str, default=str(ROOT / "dataset"), help="Path to evaluation dataset")

    args = parser.parse_args()
    ds_dir = Path(args.dataset_dir)

    if args.model.upper() == "ALL":
        for m_id, m_meta in MODEL_REGISTRY.items():
            status, _ = get_model_status(m_id)
            if status == ModelStatus.READY and not m_meta.get("is_external", False):
                evaluate_single_model(m_id, ds_dir, args.threshold)
    else:
        evaluate_single_model(args.model, ds_dir, args.threshold)


if __name__ == "__main__":
    main()