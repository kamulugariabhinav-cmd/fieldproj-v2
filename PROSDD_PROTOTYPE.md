# VoiceGuard ProSDD epoch-4 prototype branch

This branch replaces the old AASIST-focused landing page with a new responsive VoiceGuard speech-authenticity interface.

## Implemented
- Responsive dashboard with drag/drop audio upload, microphone recording, local playback, waveform and upload validation.
- Real backend-only analysis; no simulated detection scores, latencies, or artifact labels.
- Explicit AI-score uncertainty, short-audio padding and telephone-domain warnings.
- Inference URL configuration, health indicator and strict ProSDD model-name validation.
- Existing production `main` branch is unchanged.

## Not yet connected
The existing `backend/app.py` and `backend/detector.py` currently serve AASIST-family models. The frontend intentionally refuses their scores rather than presenting them as tuned ProSDD results.

To activate actual tuned ProSDD inference, an independent inference service must provide:

- `GET /health` returning `{"model_name":"ProSDD-Stage2-Epoch4","model_ready":true}` **only after loading the model successfully**.
- `POST /api/detect` accepting multipart field `audio`, returning `model_name`, `ai_score_percent` (0–100), `audio_duration_seconds`, `windows_analyzed`, `inference_time_ms`, optional `warnings`.

Required existing private artifacts (do **not** commit large checkpoints):
- `pro_sdd_ready.pth` (~1.18 GiB)
- `classifier_epoch_04.pth`
- `model_stage2realfake.py`
- `voiceguard_epoch4_config.json`

The loader must reproduce the exact research pipeline: 16 kHz mono, 64,000-sample windows, latent feature target length 200, center zero-padding when shorter, epoch-4 head, AI class index 0, decision threshold 99.70488 percent. Do not substitute AASIST preprocessing or logits.

## Deployment
Vercel hosts the static frontend. Host the large PyTorch model in a persistent Python service with sufficient memory. A free CPU instance may not be able to load the model, and latency has not been benchmarked for this checkpoint. In the frontend's **Inference server settings**, enter the HTTPS URL of the actual ProSDD service. Until then, the app honestly reports that ProSDD inference is unavailable.

**Security:** Do not commit checkpoint files, private recordings, tokens, or API credentials. Configure upload limits, CORS, authentication/rate limiting, and audio retention on the inference server.

## Validation before release
1. Verify the epoch-4 model outputs against previously scored known WAV files.
2. Test both genuine and synthetic samples and 4-second edge cases.
3. Test browser recording in Chrome/mobile.
4. Test CORS, errors, long audio, and large uploads.
5. Recheck false positives on telephone speech and short recordings.

No fine-tuning or model modification was performed in this branch.
