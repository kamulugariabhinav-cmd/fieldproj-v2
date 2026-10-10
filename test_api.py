"""
Test script for VoiceGuard Backend API
"""

import requests
import os

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get('http://localhost:5000/health')
        print("Health Check:")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_detection(file_path):
    """Test detection endpoint"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False

    try:
        with open(file_path, 'rb') as f:
            files = {'audio': f}
            data = {'threshold': 0.5}
            response = requests.post('http://localhost:5000/detect', files=files, data=data)

        print(f"\nDetection Test ({os.path.basename(file_path)}):")
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Prediction: {result['prediction']}")
            print(f"  Confidence: {result['confidence']:.3f}")
            print(f"  Assessment: {'LIKELY DEEPFAKE' if result['is_fake'] else 'LIKELY GENUINE'}")
        else:
            print(f"  Error: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Detection test failed: {e}")
        return False

def main():
    print("VoiceGuard API Test")
    print("=" * 50)

    # Test health
    if not test_health():
        print("\nBackend server may not be running. Start it with: python backend.py")
        return

    # Test with our dataset
    test_files = [
        'dataset/real/real_001.wav',
        'dataset/fake/fake_001.wav'
    ]

    for file_path in test_files:
        if os.path.exists(file_path):
            test_detection(file_path)
        else:
            print(f"File not found: {file_path}")

    print("\n" + "=" * 50)
    print("To run your own tests:")
    print("  python test_api.py")
    print("\nTo test with curl:")
    print('  curl -X POST http://localhost:5000/detect -F "audio=@file.wav" -F "threshold=0.5"')

if __name__ == "__main__":
    main()