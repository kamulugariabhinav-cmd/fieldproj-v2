# VoiceGuard V2 — AI Voice Deepfake Detection System

**An experimental AI-powered web application for detecting potentially synthetic or manipulated speech.**

VoiceGuard V2 combines a modern web dashboard, Firebase authentication, a Python FastAPI backend, and multiple speech anti-spoofing models to analyze uploaded audio recordings.

**Project status:** Research and educational prototype  
**Repository:** https://github.com/kamulugariabhinav-cmd/fieldproj-v2  
**Website:** https://fieldproj-v2.vercel.app

> **Important:** The public website and the AI inference backend are separate components. The website can remain online even when the inference server is unavailable. VoiceGuard V2 is not a production-validated forensic tool.

---

## 1. Project Overview

AI-generated speech can imitate human voices, creating challenges for verifying the authenticity of audio recordings.

VoiceGuard V2 explores how machine learning and audio analysis can help identify potentially synthetic speech.

The project provides a browser-based interface through which users can sign in, submit audio recordings, select supported detection models, and review analysis results when the inference backend is available.

### Project Objectives

- Develop a user-friendly AI voice detection prototype.
- Integrate multiple speech anti-spoofing architectures.
- Support audio submission through a web interface.
- Provide model-generated scores and detection results.
- Implement Firebase-based user authentication.
- Separate the frontend from the AI inference backend.
- Support local demonstrations without requiring paid cloud infrastructure.

---

## 2. Key Features

### Web Dashboard

- Cyberpunk-inspired responsive user interface.
- Audio upload and analysis workflow.
- Interactive visual elements and animations.
- Detection result presentation.
- Backend connection and status feedback.

### Authentication

Firebase Authentication is used for account access.

Supported authentication methods in the current frontend include:

- Google sign-in.
- Email and password authentication.
- Sign-out and account-related interface functionality.

Authentication requires a correctly configured Firebase project and authorized domains.

### AI-Based Audio Analysis

VoiceGuard V2 contains code for multiple deepfake detection and anti-spoofing architectures.

Depending on model availability and backend configuration, the system can analyze audio and return model-generated scores.

### Experimental Model Integration

The project includes implementations or integration code for:

- AASIST-based speech anti-spoofing.
- RawNet2-based speech analysis.
- Forensics detection model.
- ProSDD experimental detection model.

**Note:** Having model code in the repository does not guarantee that every model is ready for inference. Some models require separately stored pretrained weights, compatible dependencies, and successful initialization.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Authentication | Firebase Authentication |
| Backend | Python, FastAPI |
| API server | Uvicorn |
| Deep learning | PyTorch |
| Audio processing | Python audio-processing libraries |
| Model architectures | AASIST, RawNet2, Forensics, ProSDD |
| Frontend hosting | Vercel |
| Prototype inference | Local Python backend |
| Version control | Git and GitHub |

The exact Python dependencies are maintained in `requirements.txt`.

---

## 4. System Architecture

```text
                 USER
                   |
                   v
       VoiceGuard V2 Website
       Hosted on Vercel
                   |
          +--------+--------+
          |                 |
          v                 v
   Firebase Auth      Audio Analysis UI
          |                 |
          v                 v
   User Sign-in       FastAPI Backend
                       (Local / Remote)
                            |
                            v
                    Audio Preprocessing
                            |
                            v
                     Model Selection
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
           AASIST        Forensics       ProSDD
           RawNet2        Model          Model
              |             |             |
              +-------------+-------------+
                            |
                            v
                     Inference Result
                            |
                            v
                      Web Dashboard
```

### Frontend

The frontend handles:

- User interface interactions.
- Firebase authentication.
- Audio selection and submission.
- Displaying inference results.
- Communicating with the backend API.

### Backend

The FastAPI backend handles:

- HTTP API requests.
- Audio input processing.
- Model initialization and selection.
- Deep learning inference.
- Returning structured analysis results.

### AI Models

Each model may require its own architecture files, configuration, and trained checkpoint.

Model outputs should be interpreted as experimental indicators, not definitive proof of audio authenticity.

---

## 5. Project Structure

The following is a simplified overview of the important project files:

```text
fieldproj-v2/
|
|-- index.html
|-- style.css
|-- voiceguard.js
|-- config.js
|-- build.js
|-- package.json
|
|-- backend/
|   |-- app.py
|   |-- audio_processor.py
|   |-- config.py
|   |-- detector.py
|   |-- external_api.py
|   |
|   `-- models/
|       |-- __init__.py
|       |-- registry.py
|       |-- aasist.py
|       |-- rawnet2.py
|       |
|       |-- forensics/
|       |   |-- config.json
|       |   |-- model.py
|       |   `-- forensics_detector.py
|       |
|       |-- prosdd/
|       |   |-- model_stage2realfake.py
|       |   |-- prosdd_epoch4.py
|       |   `-- voiceguard_epoch4_config.json
|       |
|       `-- weights/
|
|-- requirements.txt
|-- .env.example
|-- .gitignore
|
|-- test_api.py
|-- test_forensics.py
|
|-- backend.py
|-- detect_voice.py
|-- evaluate.py
|
|-- Dockerfile
|-- render.yaml
`-- README.md
```

**Notes:**

- `backend/app.py` is the FastAPI application for VoiceGuard V2.
- `voiceguard.js` contains the current frontend application logic.
- `dashboard.html` and `script.js` were removed as part of the frontend cleanup.
- `backend.py` and `detect_voice.py` are retained as legacy or standalone entry points while their remaining dependencies are reviewed.
- `Dockerfile` and `render.yaml` may still describe the older backend startup process. They should not be treated as the verified deployment configuration for VoiceGuard V2.

---

## 6. Installation and Local Setup

### Prerequisites

Install the following:

- Python 3.11
- Git
- Visual Studio Code or another code editor
- A modern web browser
- FFmpeg for supported audio-processing workflows
- Node.js if working with the frontend build scripts

A suitable amount of RAM and disk space is required for PyTorch and the model checkpoints.

### Step 1: Clone the Repository

```bash
git clone https://github.com/kamulugariabhinav-cmd/fieldproj-v2.git
cd fieldproj-v2
```

### Step 2: Create a Python Virtual Environment

On Windows PowerShell:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use an appropriately configured terminal or Python environment rather than disabling security settings unnecessarily.

### Step 3: Install Python Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

PyTorch installation may vary depending on the operating system and whether CPU or GPU inference is required.

Refer to the official PyTorch installation instructions if the default dependency installation is incompatible with your machine.

### Step 4: Configure Environment Variables

The repository includes an example environment file:

```text
.env.example
```

Create a local environment configuration as required by the backend:

```powershell
Copy-Item .env.example .env
```

Update the values relevant to your setup.

**Never commit `.env`, service-account private keys, or secret backend API credentials to GitHub.**

Firebase web application configuration is different from a Firebase service-account credential. Firebase security must be enforced through authentication, authorization, and appropriate Firebase security rules.

### Step 5: Prepare Model Checkpoints

The GitHub repository contains model source code and configuration files, but large model checkpoint files are intentionally excluded from version control.

Depending on the selected model, local checkpoint files may include:

```text
backend/models/forensics/checkpoint_epoch_4.safetensors
backend/models/prosdd/classifier_epoch_04.pth
backend/models/prosdd/pro_sdd_ready.pth
backend/models/weights/pre_trained_DF_RawNet2.zip
```

These files must be obtained from the appropriate authorized model sources or existing project backups and placed in the paths expected by the model-loading code.

Do not assume that cloning the repository alone provides a fully initialized inference system.

---

## 7. Running the FastAPI Backend

Start the VoiceGuard V2 API from the project root:

```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

For local development, the API should be accessible at:

```text
http://127.0.0.1:8000
```

### API Documentation

FastAPI provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

### Health Endpoint

Check the backend using:

```text
http://127.0.0.1:8000/health
```

A successful HTTP response does not necessarily mean every AI model is loaded. Check the model readiness information returned by the API.

### Model Registry

The backend includes a model registry endpoint:

```text
GET /api/models
```

It can be used to inspect the models registered by the application.

### Audio Detection

The application includes audio-detection API functionality. The precise request fields, model-selection parameters, and response schema should be verified using the running FastAPI documentation before integrating external clients.

---

## 8. Running the Frontend

The primary frontend files are:

```text
index.html
style.css
voiceguard.js
```

For local development, serve the frontend using a local development server rather than relying on browser `file://` URLs.

For example, from the project root:

```powershell
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

The frontend and API may use different local ports.

Ensure the backend's CORS configuration allows the local frontend origin when testing API requests.

**Note:** Firebase Authentication may require adding the appropriate local or deployed domain to the Firebase project's authorized domains.

---

## 9. Firebase Authentication Setup

VoiceGuard V2 uses Firebase Authentication for user sign-in.

### Firebase Configuration

1. Create or open a Firebase project.
2. Register a web application.
3. Enable the required authentication providers.
4. Configure the Firebase web application settings.
5. Add the relevant domains to Firebase Authentication's authorized domains.
6. Verify that sign-in and sign-out work in the browser.

For the deployed application, the authorized domain should include:

```text
fieldproj-v2.vercel.app
```

For local testing, configure localhost as needed.

### Security Considerations

- Do not commit Firebase service-account private keys.
- Do not expose backend secret API keys in JavaScript.
- Do not treat a Firebase web API key as a substitute for access control.
- Protect sensitive Firebase resources with appropriate security rules.
- Validate authentication on the backend if endpoints require authenticated access.

---

## 10. AI Detection Models

### AASIST

AASIST is a speech anti-spoofing architecture that uses spectro-temporal representations to distinguish between genuine and spoofed speech.

The project includes AASIST-related model integration code.

### RawNet2

RawNet2 is a neural network architecture for processing raw audio signals.

VoiceGuard V2 includes RawNet2-related code and references to pretrained model resources.

### Forensics Model

The Forensics integration is located in:

```text
backend/models/forensics/
```

Important files include:

```text
config.json
model.py
forensics_detector.py
```

The model requires a compatible checkpoint and successful initialization before it can perform inference.

### ProSDD

The ProSDD integration is located in:

```text
backend/models/prosdd/
```

Important files include:

```text
model_stage2realfake.py
prosdd_epoch4.py
voiceguard_epoch4_config.json
```

The experimental ProSDD setup uses a pretrained speech representation model together with a classifier checkpoint.

The project includes an epoch-4 experimental configuration and classifier.

### Interpreting Model Scores

An AI detection score is a model output, not a guaranteed probability that a recording is synthetic.

Scores may be affected by:

- Audio duration.
- Recording quality.
- Background noise.
- Telephone and compression artifacts.
- Audio preprocessing.
- Differences between training and real-world data.
- The selected model and decision threshold.

Different models may produce different results for the same recording.

---

## 11. Experimental ProSDD Evaluation

The experimental ProSDD configuration includes evaluation information for a separate set of 100 recordings:

| Metric | Recorded experimental result |
|---|---|
| Total recordings | 100 |
| Genuine recordings | 50 |
| Spoof recordings | 50 |
| Original model AUC | 0.9444 |
| Fine-tuned model AUC | 0.9708 |
| Original model accuracy | 87% |
| Fine-tuned model accuracy | 89% |

These values describe a limited experimental evaluation, not verified performance across all real-world recording conditions.

The experiment also used a validation-selected decision threshold of approximately **99.70488%** for the fine-tuned ProSDD score.

This threshold is specific to that experimental configuration and must not be applied indiscriminately to other detection models.

### Evaluation Limitations

- The evaluation set was small.
- The model has not been validated across all languages, recording devices, codecs, or synthesis methods.
- High model scores can occur on genuine recordings under some processing conditions.
- Observed results do not guarantee future performance.
- Further independent testing is required before production use.

---

## 12. Deployment

### Current Prototype Strategy

VoiceGuard V2 is designed to support a zero-cost educational demonstration.

The current approach separates the public frontend from local inference.

| Component | Environment |
|---|---|
| Frontend website | Vercel |
| Firebase Authentication | Firebase |
| FastAPI backend | Local development computer |
| AI inference | Local computer |
| Model checkpoints | Local storage |
| Source code | GitHub |

### Public Website

https://fieldproj-v2.vercel.app

The existing Vercel project hosts the frontend.

The availability of the public website does **not** mean the AI backend is available.

### Backend Availability

For the zero-cost prototype, the FastAPI backend can run on the developer's computer.

When a remote browser needs to access that local backend, an appropriately configured HTTPS tunnel may be used for demonstrations.

A local inference server is not continuously available:

- The computer must be powered on.
- The backend must be running.
- Internet connectivity must be available.
- The frontend must use the correct backend address.
- CORS and HTTPS requirements must be satisfied.

A temporary tunnel may change its public URL between sessions.

### Previous Render Configuration

The repository includes a `render.yaml` file from an earlier deployment setup.

The previous Render backend was suspended during the prototype migration.

The current prototype does not rely on that suspended Render service for live inference.

### Production Deployment

A production deployment would require:

- A continuously available inference server.
- Sufficient RAM and CPU or GPU capacity.
- Secure model checkpoint storage.
- HTTPS and authentication controls.
- Appropriate upload limits and validation.
- Monitoring, logging, and error handling.
- Further model evaluation and security testing.

Free hosting cannot be assumed to provide sufficient resources for every model.

---

## 13. Testing

Testing should cover both the web application and the AI backend.

### Frontend Tests

Verify:

- Website loads correctly.
- Responsive layout works.
- Firebase sign-in succeeds.
- Firebase sign-out succeeds.
- Audio upload controls work.
- Backend connection errors are displayed clearly.
- Results are rendered correctly when valid API responses are received.

### Backend Tests

Verify:

- FastAPI starts without errors.
- Health endpoint responds.
- Model registry responds.
- Required checkpoints are found.
- Each enabled model initializes successfully.
- Supported audio files can be processed.
- Invalid or unsupported inputs are rejected.
- Inference results use the expected response format.

### JavaScript Syntax Check

```powershell
node --check voiceguard.js
```

### Python Tests

The repository includes testing scripts such as:

```text
test_api.py
test_forensics.py
```

Run them in a correctly configured local environment and review their individual requirements before interpreting the results.

---

## 14. Security and Privacy

VoiceGuard V2 processes user-submitted audio, which may contain personal information.

Recommended safeguards include:

- Obtain permission before analyzing another person's voice.
- Avoid uploading sensitive recordings without authorization.
- Do not expose private credentials in source code.
- Validate uploaded file types and sizes.
- Use HTTPS for remotely accessible APIs.
- Avoid retaining uploaded audio longer than necessary.
- Restrict access to any stored recordings or results.
- Do not rely on AI detection scores as sole evidence in consequential decisions.

Firebase authentication helps manage user sign-in, but it does not automatically secure every backend endpoint.

---

## 15. Known Limitations

VoiceGuard V2 is an experimental prototype.

Current limitations include:

1. The public frontend may be available while the inference backend is offline.
2. Large model checkpoints are not distributed through the GitHub repository.
3. Model initialization can require significant memory and processing time.
4. Some models may need architecture-specific dependencies.
5. Predictions can be sensitive to audio quality and preprocessing.
6. Model scores are not universally calibrated probabilities.
7. A local backend requires the developer's computer to remain running.
8. Full production reliability and security have not been established.

---

## 16. Future Improvements

Potential future development includes:

- Deploying the AI backend on suitable dedicated infrastructure.
- Improving model-loading efficiency.
- Expanding testing across different audio conditions.
- Comparing multiple model predictions.
- Improving score calibration.
- Adding stronger automated tests.
- Improving inference latency.
- Expanding accessibility and mobile support.
- Implementing privacy-conscious analysis history.
- Evaluating generalization to unseen voice-generation systems.

---

## 17. GitHub Repository

**Repository:**  
https://github.com/kamulugariabhinav-cmd/fieldproj-v2

The main development branch is:

```text
main
```

To contribute changes to the repository:

```powershell
git add .
git commit -m "Describe your changes"
git push origin main
```

Before committing, verify that no private credentials, local environments, large model checkpoints, or unnecessary generated files are staged.

---

## 18. Disclaimer

VoiceGuard V2 is intended for **educational, experimental, and research purposes**.

Its predictions may be incorrect. Genuine recordings may be flagged as synthetic, and synthetic recordings may be classified as genuine.

Results should be interpreted alongside other evidence and should not be used as the sole basis for identity verification, accusations, disciplinary decisions, or other high-stakes judgments.

---

## 19. Project Information

**Project Name:** VoiceGuard V2  
**Project Type:** AI Voice Deepfake Detection Prototype  
**Application Type:** Web Application  
**Frontend:** HTML, CSS, JavaScript  
**Authentication:** Firebase  
**Backend:** FastAPI  
**Machine Learning:** PyTorch  
**Hosting:** Vercel frontend with local inference for prototype demonstrations  
**Development Repository:** https://github.com/kamulugariabhinav-cmd/fieldproj-v2

---

**VoiceGuard V2 — Exploring AI-powered speech authenticity analysis.**
