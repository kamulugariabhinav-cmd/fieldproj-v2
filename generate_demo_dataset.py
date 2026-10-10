"""
Generate a demo dataset for VoiceGuard prototype.
Creates synthetic audio files labeled as real and fake voice.
"""

import os
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path

def generate_real_voice(duration=3.0, sr=16000, file_id=1):
    """
    Generate a speech-like signal (real voice simulation).
    Uses modulated noise with time-varying formants.
    """
    t = np.linspace(0, duration, int(sr * duration), False)

    # Base noise
    noise = np.random.normal(0, 0.3, len(t))

    # Formant frequencies (simulate vowels changing)
    f1 = 500 + 300 * np.sin(2 * np.pi * 0.5 * t)  # First formant
    f2 = 1500 + 500 * np.sin(2 * np.pi * 0.3 * t) # Second formant

    # Apply bandpass filtering via resonance (simple approximation)
    # We'll create a signal by filtering noise through time-varying resonators
    signal = np.zeros_like(t)

    # Simple approach: add sinusoids at formant frequencies with amplitude modulation
    for i in range(len(t)):
        # Time-varying amplitudes
        amp1 = 0.5 * (1 + np.sin(2 * np.pi * 0.8 * t[i]))
        amp2 = 0.3 * (1 + np.sin(2 * np.pi * 0.6 * t[i] + np.pi/3))

        # Formant contributions
        signal[i] = (noise[i] *
                    (amp1 * np.sin(2 * np.pi * f1[i] * t[i]) +
                     amp2 * np.sin(2 * np.pi * f2[i] * t[i])))

    # Add some pitch harmonics
    f0 = 120 + 20 * np.sin(2 * np.pi * 0.2 * t)  # Fundamental frequency
    for h in [1, 2, 3]:
        signal += 0.2/h * np.sin(2 * np.pi * f0 * h * t)

    # Normalize
    signal = signal / np.max(np.abs(signal)) * 0.8

    return signal, sr

def generate_fake_voice(duration=3.0, sr=16000, file_id=1):
    """
    Generate a more synthetic/robotic voice (fake voice simulation).
    Less natural variation, more uniform characteristics.
    """
    t = np.linspace(0, duration, int(sr * duration), False)

    # More constant fundamental frequency with less variation
    f0_base = 150  # Higher pitched, less natural
    f0 = f0_base + 5 * np.sin(2 * np.pi * 0.5 * t)  # Very little variation

    # Generate harmonic series
    signal = np.zeros_like(t)
    for h in range(1, 6):
        # Less natural amplitude decay
        amp = 0.5 / (h**0.5)
        # Add some jitter to make it slightly less perfect but still robotic
        phase_jitter = 0.1 * np.sin(2 * np.pi * 0.2 * h * t)
        signal += amp * np.sin(2 * np.pi * f0 * h * t + phase_jitter)

    # Add very light noise
    noise = np.random.normal(0, 0.05, len(t))
    signal += noise

    # Apply a slight filtering to make it more uniform (less formant movement)
    from scipy import signal as scipy_signal
    # Simple low-pass to reduce high frequency variation
    b, a = scipy_signal.butter(4, 3000/(sr/2), btype='low')
    signal = scipy_signal.filtfilt(b, a, signal)

    # Normalize
    signal = signal / np.max(np.abs(signal)) * 0.8

    return signal, sr

def main():
    # Create dataset directory structure
    dataset_root = Path("dataset")
    real_dir = dataset_root / "real"
    fake_dir = dataset_root / "fake"

    real_dir.mkdir(parents=True, exist_ok=True)
    fake_dir.mkdir(parents=True, exist_ok=True)

    # Generate files
    n_real = 5
    n_fake = 5

    print(f"Generating {n_real} real voice samples...")
    for i in range(n_real):
        audio, sr = generate_real_voice(file_id=i+1)
        filename = real_dir / f"real_{i+1:03d}.wav"
        sf.write(filename, audio, sr)
        print(f"  Created {filename}")

    print(f"Generating {n_fake} fake voice samples...")
    for i in range(n_fake):
        audio, sr = generate_fake_voice(file_id=i+1)
        filename = fake_dir / f"fake_{i+1:03d}.wav"
        sf.write(filename, audio, sr)
        print(f"  Created {filename}")

    # Create manifest CSV
    manifest_path = dataset_root / "manifest.csv"
    with open(manifest_path, 'w') as f:
        f.write("filename,label,split\n")
        # Real files
        for i in range(n_real):
            f.write(f"real/real_{i+1:03d}.wav,real,train\n")
        # Fake files
        for i in range(n_fake):
            f.write(f"fake/fake_{i+1:03d}.wav,fake,train\n")

    print(f"\nDataset created at: {dataset_root.absolute()}")
    print(f"Manifest saved to: {manifest_path.absolute()}")
    print("\nSample structure:")
    print("dataset/")
    print("├── real/")
    print("│   ├── real_001.wav")
    print("│   ├── real_002.wav")
    print("│   └ ...")
    print("├── fake/")
    print("│   ├── fake_001.wav")
    print("│   ├── fake_002.wav")
    print("│   └ ...")
    print("└── manifest.csv")

if __name__ == "__main__":
    main()