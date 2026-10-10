"""
VoiceGuard Backend - Basic Voice Deepfake Detection API
=======================================================

A simple Flask backend that provides an API endpoint for detecting deepfake voices.
This backend uses the same heuristic approach as the detect_voice.py script but
exposes it via HTTP for integration with frontend applications.

Endpoints:
- POST /detect - Accepts audio file and returns deepfake detection result
- GET /health - Health check endpoint
- GET /stats - Returns dataset statistics (real/fake counts)
"""

import os
import tempfile
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import numpy as np
from flask_cors import CORS

# Import our detection function
from detect_voice import detect_deepfake, extract_audio_features, heuristic_deepfake_score

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a', 'ogg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'VoiceGuard Backend',
        'version': '1.0.0'
    })

@app.route('/detect', methods=['POST'])
def detect_deepfake_endpoint():
    """
    Detect deepfake voice in uploaded audio file.

    Expects:
    - File upload in 'audio' field
    - Optional 'threshold' form field (default 0.5)

    Returns:
    - JSON with detection results
    """
    # Check if file was uploaded
    if 'audio' not in request.files:
        return jsonify({
            'error': 'No audio file provided',
            'message': 'Please upload an audio file in the "audio" field'
        }), 400

    file = request.files['audio']

    # Check if file is empty
    if file.filename == '':
        return jsonify({
            'error': 'No file selected',
            'message': 'Please select an audio file to upload'
        }), 400

    # Check file extension
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type',
            'message': f'Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    # Get threshold from form data (optional)
    try:
        threshold = float(request.form.get('threshold', 0.5))
        if threshold < 0 or threshold > 1:
            raise ValueError
    except ValueError:
        return jsonify({
            'error': 'Invalid threshold',
            'message': 'Threshold must be a number between 0 and 1'
        }), 400

    # Save uploaded file temporarily
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    try:
        file.save(filepath)

        # Run detection
        result = detect_deepfake(filepath, threshold)

        # Clean up temporary file
        try:
            os.remove(filepath)
        except:
            pass  # Ignore cleanup errors

        # Add service info to response
        result['service'] = 'VoiceGuard Backend'
        result['timestamp'] = np.datetime64('now').astype(str)

        return jsonify(result)

    except Exception as e:
        # Clean up file on error
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except:
            pass

        return jsonify({
            'error': 'Processing failed',
            'message': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """
    Get dataset statistics: count of real and fake voices.
    Assumes dataset is in ./dataset/real and ./dataset/fake
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    real_dir = os.path.join(base_dir, 'dataset', 'real')
    fake_dir = os.path.join(base_dir, 'dataset', 'fake')

    real_count = 0
    fake_count = 0

    if os.path.exists(real_dir):
        real_count = len([f for f in os.listdir(real_dir) if f.endswith('.wav')])

    if os.path.exists(fake_dir):
        fake_count = len([f for f in os.listdir(fake_dir) if f.endswith('.wav')])

    return jsonify({
        'real_count': real_count,
        'fake_count': fake_count,
        'total': real_count + fake_count
    })

@app.route('/', methods=['GET'])
def index():
    """Simple info page"""
    return jsonify({
        'service': 'VoiceGuard Backend API',
        'version': '1.0.0',
        'endpoints': {
            'GET /health': 'Health check',
            'POST /detect': 'Upload audio file for deepfake detection',
            'GET /stats': 'Get dataset statistics (real/fake counts)',
            'GET /': 'This information'
        },
        'usage': {
            'POST /detect': {
                'parameters': {
                    'audio': 'audio file (required)',
                    'threshold': 'detection threshold 0-1 (optional, default 0.5)'
                },
                'returns': 'JSON with detection results'
            }
        }
    })

if __name__ == '__main__':
    print("Starting VoiceGuard Backend...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /detect - Detect deepfake in audio file")
    print("  GET  /stats - Get dataset statistics")
    print("  GET  / - API information")
    print("\nServer starting on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)