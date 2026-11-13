# VoiceGuard integrations

| Integration | Role | Configuration or evidence |
|---|---|---|
| Firebase Authentication | Google, GitHub, email/password | Existing public web config; private provider settings in Firebase |
| Google account lookup | Server-side Firebase identity verification | `VOICEGUARD_FIREBASE_API_KEY` or existing public key |
| SQLite | Local profiles and history | `VOICEGUARD_DB_PATH` |
| Hugging Face | Pella, NII, Forensics checkpoint sources | Pinned revisions and recorded verification metadata |
| Official ProSDD repository and Drive | Public ASVspoof2019 release | Author-linked file and locally recorded SHA256 |
| Three.js and Manrope | Homepage graphics and typography | Self-hosted assets with license files |
| Document Python runtime | PDF/Office exports | `VOICEGUARD_EXPORT_PYTHON` |

Cloud Firestore is not configured as the database. SQLite is an intentional
local alternative. No external service receives stored history for document
export. Public demo playback exposes only the two allowlisted project WAVs.

GitHub sign-in requires its OAuth app to be configured through Firebase. The
developer's GitHub issue link and email links are user-initiated contact actions,
not background message sending.

Source details: `voiceguard_addon/RECOVERY_REPORT.md`, `SIGNIN_SETUP.md`, and
per-checkpoint verification files. Adding hosting or another integration is a
separate deployment task, not something this documentation activates.
