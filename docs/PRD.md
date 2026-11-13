# VoiceGuard product requirements

## Purpose

An academic workspace for investigating whether speech contains patterns
associated with synthetic audio. The result supports investigation; it cannot
prove authenticity, identity, or fraud.

## Users and journeys

- Visitors learn about the project on the public homepage.
- Dashboard entry links offer Firebase sign-in first, with explicit guest access.
- Researchers upload or record speech, choose a detector, and review results.
- Users retain history and export selected records for further investigation.

## Requirements

Preserve VoiceGuard branding, responsive navigation, real waveform feedback,
file validation, named model results, uncertainty notices, and account isolation.
Support PellaV2, NII AntiDeepfake, Forensics XLS-R Wild, and official ProSDD
ASVspoof2019 only with compatible trained weights and completed pipeline checks.

Audio limits are 25 MiB and five minutes. Supported extensions are WAV, MP3,
FLAC, OGG, M4A, AAC, MP4, and WebM. The decoder validates actual audio.

## Acceptance

Real uploads return finite scores and the correct model identity; missing
dependencies fail explicitly. History persists and remains scoped to its owner.
No fabricated predictions, customer claims, or universal accuracy guarantees.
