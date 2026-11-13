# VoiceGuard local extensions

Run from the project root:

```powershell
python backend_with_pella_nii.py
```

Open http://127.0.0.1:8001 for the public homepage, or
http://127.0.0.1:8001/dashboard for audio analysis. This separate launcher adds Pella and NII to the
existing selector and result display. Pella is selected by default. Recovered
Forensics and official ProSDD releases are enabled only after their real
inference checks pass. Missing or unchecked weights stay unavailable.
The original `python backend.py` command is unchanged. Use port 8001 to avoid
interrupting an existing server on port 8000. `PORT` and `HOST` can override this.

Every existing source file is left untouched. The optional server reads the
original HTML and JavaScript and extends their responses in memory. Existing
Inference uses a separate CPU worker for each request. The original legacy
endpoint remains a fallback for separately supplied original checkpoints.
Missing weights produce a clear 503 response.
Presentation refinements are served only by the optional launcher.
For the optional server, the served script sends uploads to the same local
origin instead of the fixed Cloudflare tunnel in the original script.
The health endpoint confirms the web service is running; `/api/addon/status`
reports isolated-worker mode and completed model-pipeline checks.

## Models and weights

- PellaV2: `mo-thecreator/Deepfake-audio-detection`, pinned revision
  `e4d9874b493362149cec96ced85f00b00b1a04c0`. Loads the existing Hugging Face
  cache offline. Its actual configuration is Wav2Vec2 **base** (768 hidden
  units, 12 layers), rather than the 300M architecture stated in the summary.
  The cached configuration explicitly maps 0=fake, 1=real.
- NII: `nii-yamagishilab/mms-300m-anti-deepfake`, pinned revision
  `7928e119e09f616b2ce698892e00ca22dbaa40bf`. Official weights are stored only
  under `voiceguard_addon/weights/nii`. This is the trained AntiDeepfake
  checkpoint, including its classifier, rather than plain MMS weights.
  The model card specifies waveform layer normalization, mean pooling, and
  output order fake/real. The add-on maps fairseq inference weights to the
  equivalent Transformers Wav2Vec2 implementation with strict loading.
  Pretraining-only quantizer/projection modules are deliberately excluded.
  Numerical parity with an independent fairseq installation is not established.

Sources:
- https://huggingface.co/mo-thecreator/Deepfake-audio-detection
- https://huggingface.co/nii-yamagishilab/mms-300m-anti-deepfake

NII weights are CC BY-NC-SA 4.0, attributed to NII Yamagishi Lab.
Pella's model card specifies Apache-2.0.

Models load on first use, on CPU. Initial loading can take time and NII requires
substantial RAM (its checkpoint alone is 1.27 GB). No dependency files or installed packages were
changed. The implementation uses the project's existing torch, transformers,
numpy, safetensors, FastAPI and audio dependencies. Missing weights cause an
error response without fabricated probabilities.
One isolated model worker runs at a time and exits after completing its request.
This bounds memory on this machine and keeps model dependencies out of the web
server. Weights are reloaded for each request. Model requests are serialized.

## Scoring and validation

Mono 16 kHz audio uses the existing decoder. Both models use fake class 0 and
real class 1; a 0.5 fake probability gives the binary verdict. Scores are
uncalibrated softmax outputs, not measured accuracy. For bounded memory, clips
over 10 seconds are split into windows and probabilities are weighted by window
duration. This aggregation has not been benchmarked.

Run route/error tests:

```powershell
python -B -m pytest voiceguard_addon/test_addon.py -q -p no:cacheprovider
```

Run actual multipart uploads with existing sample files and verify original hashes:

```powershell
python -B -m voiceguard_addon.validate_inference
```

Results are written to `voiceguard_addon/validation.json`. Folder labels in the
supplied dataset are not independently verified, so this is a smoke check only.

To restore or verify NII weights later (network access required):

```powershell
python -B voiceguard_addon/download_nii.py
```

This downloads from the pinned official revision, resumes partial transfers,
retries network failures, and checks the published LFS SHA256.

`original_files.sha256.json` records pre-existing file hashes. Model loading and
inference smoke tests establish that trained weights execute, not that the
detector correctly identifies arbitrary human or generated speech. A labeled,
independent speech evaluation is still required before reporting accuracy.

## Completed checks

- Official NII checkpoint SHA256 verified against Hugging Face LFS metadata.
- Strict trained-parameter loading and inference completed for both models.
- Four route/error tests passed.
- Four actual multipart uploads completed: both models returned Human Detected
  for `bonafide_001.wav` and AI Detected for `spoof_001.wav`.
- All 64 pre-existing files match their recorded SHA256 hashes.
- Independent accuracy evaluation and fairseq numerical parity remain unverified.

## History exports and controls

The logo toggles the sidebar. The developer menu fades out after four seconds
of inactivity and returns on pointer, keyboard, scroll, or touch activity.
The analysis display has a real audio waveform. It uses
microphone time-domain samples while recording, playback samples while playing,
or decoded file samples during silent analysis visualization. The file display
loops its audio samples while waiting; it does not represent inference progress.
Tap the waveform or press Enter/Space to pause/resume the display. A paused
display is flat and does not alter backend inference. The recorder also has a
separate Pause/Resume recording button that pauses the MediaRecorder itself.
The email and GitHub actions retain their clickable icons without text bubbles.

The history export button offers PDF, Excel XLSX, Word DOCX, and JSON. It exports
records matching the current search and prediction filter. PDF and Office files
are generated on the local server without uploading data to a third party.
JSON stays in the browser. The export endpoint keeps no history files.

This installation uses the bundled document Python runtime recorded in
`export_runtime.json`. On another machine, install `export-requirements.txt`
and set `VOICEGUARD_EXPORT_PYTHON` to that Python executable. The original
project dependency list has not been changed.

## User database

The add-on uses free SQLite storage on the server and retains Firebase for
sign-in. It does not use or require a Cloud Firestore instance. The database
file is `voiceguard_addon/data/voiceguard.sqlite3` (override with
`VOICEGUARD_DB_PATH`). The data directory is excluded by its own `.gitignore`
and is not served by any web route. Keep this file on persistent storage if
deploying; an ephemeral hosting filesystem will lose it on replacement.

Stored data:
- Profile: account type, Firebase display name and email (for signed-in users),
  creation timestamp, and last-seen timestamp.
- Up to 100 analysis records per account: ID, recording filename, date, model,
  fake-score percentage, and prediction.
- No passwords, Firebase tokens, or raw audio in the database.

Firebase ID tokens are verified with Google's account lookup endpoint, using
the existing public Firebase project API key. The UID comes from Google's
response. Client-supplied user IDs are ignored. Tokens are not accepted merely
because they can be decoded. The server must have internet access to verify
signed-in requests; failed verification does not fall back to guest access.

Guests get a random, HttpOnly, SameSite=Strict cookie lasting 30 days. Only a
hash of the cookie identifies their stored profile. Clearing or losing this
cookie loses access to that guest history. Guest data is not merged into a
signed-in account automatically. Signing in from another device accesses that
account's records on the same server. This local server defaults to loopback.

The footer's expandable User data section reports connection/save errors and
offers Reconnect. It opens automatically for storage errors. Pending scans
can be retried in the current page; leave the page open until saving succeeds.
Import existing browser history explicitly using the footer button. Imports
are scoped to the current account and leave the old browser copy intact.
Delete buttons and Clear all delete server history for the current account.

To back up, stop the server and copy the SQLite file to private storage. Keep
backups outside the source repository. A restored copy at the same database
path is read when the server restarts.

Verification commands:

```powershell
python -B -m pytest voiceguard_addon/test_database.py voiceguard_addon/test_addon.py -q -p no:cacheprovider
node voiceguard_addon/test_storage_client.js
```

Tests use temporary databases. They cover durable storage, separate guests,
Firebase UID isolation with a mocked verifier, invalid authentication, input
validation, cross-origin write rejection, retention, deletion, account switching,
and retry. Live signed-in Firebase requests require an actual user sign-in and
have not been validated in this session.

Firebase verification reference: https://firebase.google.com/docs/reference/rest/auth/#section-get-account-info

## Public homepage

The root route and `/index.html` now serve a separate public introduction before
sign-in. The working dashboard is at `/dashboard`. Guest access stays explicit;
Firebase Google sign-in uses the same project as the dashboard and redirects to
it after success. The original welcome overlay is hidden on the dashboard.

The homepage includes a pointer/keyboard-controlled Three.js signal illustration,
motion pause/resume, reduced-motion support, a mobile navigation menu, real
project sample playback with waveform levels, accessible model tabs, and native
FAQ disclosures. It does not initialize the backend models or store user data
merely by opening the public page.

Three.js r169 and the existing Manrope web font are self-hosted. If WebGL is
unavailable, a branded vector/CSS illustration remains visible. Animation
rendering is skipped when the hero is out of view or the document is hidden.
The Firebase SDK is loaded from Google's existing CDN.

The public sample route exposes only the two allowlisted project test WAVs.
These retain their supplied dataset labels with an explicit provenance caveat.
The hero is an illustration and the demo does not display a fabricated model
result. Pindrop's content progression informed the homepage; no Pindrop assets,
statistics, customer claims, or copy are used.

Additional checks:

```powershell
python -B -m pytest voiceguard_addon/test_homepage.py -q -p no:cacheprovider
node voiceguard_addon/test_homepage_client.js
```

Browser visual QA and actual Google login remain unverified because local
browser access was blocked by the saved browser permission setting.

## Recovered models and sign-in providers

Forensics XLS-R Wild and the official ProSDD ASVspoof2019 release now have public
trained checkpoints in add-on storage. The private ProSDD epoch-4 artifacts
remain unrecovered; its official public replacement is named distinctly in
the selector and every returned result. See `RECOVERY_REPORT.md` for sources,
hashes, exact preprocessing, class mappings, and validation limits.

The isolated inference runtime is `.inference-env/Scripts/python.exe`, or the
executable set by `VOICEGUARD_INFERENCE_PYTHON`. A readiness marker is written
after confirming PyTorch, Transformers, and NumPy work together. Each model's
strict-loading and sample checks are recorded under `weights/<model>`.

To recover these public files again:

```powershell
python -B voiceguard_addon/recover_forensics.py
python -B voiceguard_addon/recover_prosdd.py
python -B -m voiceguard_addon.validate_recovered
python -B -m voiceguard_addon.validate_live_models
```

Email/password and GitHub are added alongside Google in the public sign-in
dialog. Account creation and password reset use Firebase. Provider settings
were confirmed enabled by the owner. See `SIGNIN_SETUP.md`. No passwords or
OAuth client secrets are stored in VoiceGuard's SQLite database.
