# Model recovery and sign-in update

The missing files were real dependencies, not UI settings. ProSDD previously
expected a private Google Drive epoch-4 classifier and a Stage-2 backbone.
Forensics expected a published checkpoint that was absent from the project.
Neither could perform inference without trained weights.

## Forensics XLS-R Wild

- Publisher: https://huggingface.co/eliya/forensics_0.3B_xlsr_wild_deepfake_classifier
- Revision: `0cbc87b3fbd683ff8c8c961bcf244a8d5f1bcf02`
- File: `weights/forensics/checkpoint_epoch_4.safetensors`
- Size: 1,263,980,788 bytes.
- Published SHA256 verified:
  `39e37fa5a958c2b46ebb6a5937874c36c39003906dcdd5d0aba6154bc6b2dc21`
- The publisher's architecture file exactly matches the project architecture.
- Strict loading covers all inference parameters. Only the four documented,
  unused `projection` tensors are excluded.
- Preprocessing follows the published implementation: mono 16 kHz, peak
  normalization, five-second center crop or repetition for shorter recordings.
- Output: fake score = `1 - sigmoid(logit)`; real label = 1.
- Publisher specifies CC BY-NC 4.0.

## Official ProSDD ASVspoof2019

- Source: https://github.com/ProSDD/codes
- Source revision: `bdb80440cd946368e77f4b51f6ddf26c7443dc33`
- Authors' public checkpoint folder:
  https://drive.google.com/drive/folders/1h250-Um5qWo-rpeOE6K_Gdeygy46k3xg
- Public release: `ProSDD_Trained2019`, Drive file
  `1RHY-VELyi4XH-L1egeRcgWjHdkdWV2bO`.
- File: `weights/prosdd/official_asv2019.pth`
- Size: 1,265,875,476 bytes, matching the authors' download metadata.
- Locally recorded SHA256:
  `d2cb857cf7b14a9caa200cde14100062e72fe2a39865bc435f83f5be74da1c8a`.
  The authors do not publish a reference SHA256, so this is not a claimed
  comparison against an author-provided digest.
- Architecture matches the project code after normalizing line endings.
- Safe `weights_only=True` loading, strict state restoration, and no random
  inference fallback. The full trained classifier comes from the public file.
- Inference follows the authors' clean encoder path, target length 200, mean
  pooling, centered four-second crop/zero padding. Class 0 is spoof, class 1 real.
- Response model name: `ProSDD-Official-ASV2019`.

This is the public ProSDD release, not a recovery of the missing private
`classifier_epoch_04.pth`. The old private classifier hash and 99.70488 threshold
are not attributed to the public release. The public adapter uses an explicitly
uncalibrated 0.5 fake-score decision point.

## Inference runtime

An isolated environment at `.inference-env` uses official CPU PyTorch 2.5.1 and
Transformers 4.44.2. It does not need the optional torchaudio package that Windows
blocked in the existing global environment. No application-control or other
security settings were changed, and the blocked binary is not loaded.

One isolated worker performs each model request and exits. This avoids holding
multiple 300M-parameter models in the web server's limited RAM. All four models
use the same existing audio decoder and upload endpoint.

Models are enabled only after checkpoint presence, runtime readiness, strict
parameter loading, and project-sample inference checks. Per-model results are
stored in `weights/<model>/validation.json`; the combined report is
`recovery/model_validation.json`. These are pipeline smoke checks on supplied
samples, not an independent accuracy benchmark or a guarantee for unseen audio.

## Sign-in

The homepage now supports Google, GitHub, and email/password through the existing
Firebase project. It includes email account creation, password reset, password
visibility controls, and provider-specific error feedback. The project owner
confirmed all three providers are enabled. See `SIGNIN_SETUP.md`.

The client checks use a mocked Firebase SDK. No personal login was performed
by the agent. The existing SQLite account storage accepts verified Firebase
identities from any of these providers.

## Completed checks

- Sixteen API/regression checks passed.
- Client checks passed for email/password, GitHub, account creation, password
  reset, provider errors, homepage navigation, storage, and waveform controls.
- Strict trained-parameter loading and two project-sample predictions completed
  for each of Pella, NII, Forensics, and official ProSDD.
- Eight real multipart HTTP uploads returned 200 with the expected model names
  and finite complementary scores. Each model classified the supplied human
  sample as human and the supplied spoof sample as AI.
- Actual results are in `recovery/api_validation.json`. A further restart check
  is recorded in `recovery/restart_validation.json`.
- These are two supplied samples per model, not a representative benchmark.
