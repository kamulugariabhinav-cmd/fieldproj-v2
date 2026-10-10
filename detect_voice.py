"""
Basic Voice Deepfake Detection Script
====================================

This script demonstrates a simple approach to detecting AI-generated (deepfake) voice
using audio feature analysis. For demonstration purposes, it uses basic audio features
and a heuristic threshold. In a real implementation, this would be replaced with
a trained machine learning model.

Dependencies:
- librosa
- numpy
- scipy

Install with: pip install librosa numpy scipy
"""

import librosa
import numpy as np
import sys
import os
from scipy import stats

def extract_audio_features(audio_path):
    """
    Extract basic audio features that may indicate voice deepfakes.

    Features extracted:
    - Zero crossing rate
    - Spectral centroid
    - Spectral rolloff
    - MFCCs (Mel-frequency cepstral coefficients)
    - Spectral flatness (measure of noise vs tonal components)
    """
    try:
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)

        # Extract features
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]

        # Compute statistics for each feature
        features = {
            'zcr_mean': float(np.mean(zcr)),
            'zcr_std': float(np.std(zcr)),
            'centroid_mean': float(np.mean(spectral_centroids)),
            'centroid_std': float(np.std(spectral_centroids)),
            'rolloff_mean': float(np.mean(spectral_rolloff)),
            'rolloff_std': float(np.std(spectral_rolloff)),
            'flatness_mean': float(np.mean(spectral_flatness)),
            'flatness_std': float(np.std(spectral_flatness)),
        }

        # Add MFCC statistics
        for i in range(mfccs.shape[0]):
            features[f'mfcc_{i}_mean'] = float(np.mean(mfccs[i]))
            features[f'mfcc_{i}_std'] = float(np.std(mfccs[i]))

        return features, y, sr

    except Exception as e:
        print(f"Error processing audio file: {e}")
        return None, None, None

def heuristic_deepfake_score(features):
    """
    Simple heuristic to score likelihood of deepfake based on audio characteristics.

    This is a simplified approach - real detection would use trained models.
    Deepfake voices often show:
    - Unconsistent spectral features
    - Abnormal zero crossing patterns
    - Different MFCC distributions
    """
    if features is None:
        return 0.0

    # Simple heuristic combining several features
    # In reality, you'd use a ML model trained on real vs fake voices

    score = 0.0

    # Spectral flatness - fake voices may have different noise characteristics
    flatness = features['flatness_mean']
    if flatness > 0.15:  # Arbitrary threshold
        score += 0.3

    # Zero crossing rate inconsistency
    zcr = features['zcr_mean']
    if zcr < 0.03 or zcr > 0.08:  # Outside normal speech range
        score += 0.2

    # Spectral centroid - fake voices may have unusual frequency emphasis
    centroid = features['centroid_mean']
    if centroid < 1000 or centroid > 4000:  # Outside typical speech range
        score += 0.2

    # MFCC variance - deepfakes may have different cepstral characteristics
    mfcc_vars = [features[f'mfcc_{i}_std'] for i in range(13)]
    avg_mfcc_var = np.mean(mfcc_vars)
    if avg_mfcc_var > 50 or avg_mfcc_var < 5:  # Unusual variance
        score += 0.3

    # Normalize score to 0-1 range
    return float(min(score, 1.0))

def detect_deepfake(audio_path, threshold=0.5):
    """
    Detect if audio contains deepfake voice.

    Args:
        audio_path: Path to audio file
        threshold: Detection threshold (0-1), above which we classify as fake

    Returns:
        dict: Contains prediction, confidence score, and features
    """
    print(f"Analyzing audio file: {audio_path}")

    # Extract features
    features, y, sr = extract_audio_features(audio_path)

    if features is None:
        return {
            'error': 'Failed to process audio file',
            'is_fake': False,
            'confidence': 0.0
        }

    # Get deepfake score
    fake_score = heuristic_deepfake_score(features)

    # Make prediction
    is_fake = fake_score >= threshold

    result = {
        'audio_file': os.path.basename(audio_path),
        'is_fake': bool(is_fake),
        'confidence': float(fake_score),
        'threshold': threshold,
        'features': features,
        'prediction': 'DEEPFAKE DETECTED' if is_fake else 'VOICE APPEARS TO BE GENUINE'
    }

    return result

def main():
    if len(sys.argv) < 2:
        print("Usage: python detect_voice.py <audio_file> [threshold]")
        print("Example: python detect_voice.py sample.wav 0.6")
        print("\nNote: This is a basic demonstration. For production use,")
        print("replace the heuristic with a trained ML model.")
        return

    audio_file = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5

    if not os.path.exists(audio_file):
        print(f"Error: File '{audio_file}' not found")
        return

    result = detect_deepfake(audio_file, threshold)

    if 'error' in result:
        print(f"Error: {result['error']}")
        return

    print("\n=== VoiceGuard Detection Result ===")
    print(f"File: {result['audio_file']}")
    print(f"Prediction: {result['prediction']}")
    print(f"Confidence: {result['confidence']:.3f} (threshold: {result['threshold']})")
    print(f"Assessment: {'LIKELY DEEPFAKE' if result['is_fake'] else 'LIKELY GENUINE'}")
    print("=" * 40)

    # Show some key features for debugging
    if result['features']:
        print("\nKey Features:")
        print(f"  Zero Crossing Rate: {result['features']['zcr_mean']:.4f}")
        print(f"  Spectral Centroid: {result['features']['centroid_mean']:.1f} Hz")
        print(f"  Spectral Flatness: {result['features']['flatness_mean']:.4f}")

if __name__ == "__main__":
    main()