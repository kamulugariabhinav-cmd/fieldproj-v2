# VoiceGuard feature inventory

## Implemented

- Public homepage with interactive 3D signal controls and project audio samples.
- Sign-in-first dashboard links with explicit guest access.
- Firebase Google, GitHub, and email/password UI; creation and password reset.
- Audio upload, browser recording, pause/resume, and real audio-level displays.
- Four trained detectors through isolated CPU workers.
- Named inference results, uncertainty notices, and checkpoint/runtime errors.
- Per-user SQLite profiles and history, browser-history import, and deletion.
- History search/filter and PDF, XLSX, DOCX, JSON export choices.
- About model explorer, local Guide file checker, and Contact draft builder.
- Responsive navigation, static twin-color branding, liquid backgrounds,
  reduced-motion support, and scroll reveals.

## Boundaries

The homepage signal illustration is not a detector. Guide file checks do not
upload audio or assess authenticity. Contact tools prepare drafts; the user
reviews and sends them. Database storage does not retain raw audio.

The private ProSDD epoch-4 classifier has not been recovered. The available
ProSDD model is the explicitly named official ASVspoof2019 release.

## Before adding a feature

Record the trigger, expected result, affected routes, stored data, error states,
accessibility behavior, and verification needed. Avoid adding simulated scores
or unsupported product claims to make the interface appear complete.
