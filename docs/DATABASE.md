# VoiceGuard database

## Storage

SQLite file: `voiceguard_addon/data/voiceguard.sqlite3`.
Override with `VOICEGUARD_DB_PATH`. Database initialization is in
`voiceguard_addon/database.py`; its data directory has its own ignore file and
is not exposed as a static web directory.

| Table | Key | Stored fields |
|---|---|---|
| users | user_key | kind, display_name, email, created_at, last_seen |
| history | user_key + record_id | recorded_at, serialized record data |

History rows reference users with cascading deletion. An owner/date index
supports recent-history retrieval. Retain at most 100 records per identity.

## Identity

Signed-in keys use a Firebase UID verified by Google. Guest keys use the SHA256
of a random HttpOnly browser cookie. Client-supplied user IDs are not trusted.
Guest history is not silently merged into an authenticated account.

## Data handling

Store profile details and analysis metadata, not passwords, ID tokens, or raw
audio. Existing browser history is imported only through the explicit import
control. Back up the database while the service is stopped. A deployed server
requires persistent disk; this is not a hosted Firestore implementation.
