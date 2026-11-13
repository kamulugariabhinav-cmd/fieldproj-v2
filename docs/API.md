# VoiceGuard API

Base URL for local development: `http://127.0.0.1:8001`.
Interactive schema: `/docs`. Schemas are the source of truth for request shapes.

| Method | Path | Purpose |
|---|---|---|
| GET | /health, /api/health | Web-service liveness, not proof of loaded models |
| GET | /api/addon/status | Worker mode and completed pipeline checks |
| POST | /api/detect, /detect | Multipart `audio` and `model` fields |
| GET | /api/user | Current verified or guest profile |
| GET | /api/user/history | Current owner's latest history |
| POST | /api/user/history | Save `records` array with valid IDs and scores |
| DELETE | /api/user/history/{record_id} | Delete an owned record |
| DELETE | /api/user/history | Clear the current owner's history |
| POST | /api/history/export/{kind} | Export submitted records as pdf/xlsx/docx |
| GET | /api/public-demo/{sample} | Allowlisted human/synthetic project WAVs |

Detection model values: `pella`, `nii`, `forensics`, `prosdd`. Results identify
the actual trained model and include complementary fake/real scores, warnings,
and timing. Scores are uncalibrated.

Database writes require `X-VoiceGuard-Client: 1`. Signed-in calls use
`Authorization: Bearer <Firebase ID token>`; guests use a same-origin cookie.
Cross-origin database writes are rejected.

Typical errors: 400 validation, 401 identity verification, 403 write protection,
413 upload/payload limit, 500 inference failure, 503 unavailable dependencies.
