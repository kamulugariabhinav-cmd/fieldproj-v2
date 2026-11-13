# VoiceGuard authentication and security

## Authentication

Firebase provides Google, GitHub, and email/password authentication. The owner
confirmed these providers are enabled. Actual personal login was not performed
by the agent; client behavior was tested with a mocked SDK.

The server verifies Firebase ID tokens using Google's account lookup endpoint
and the existing project API key. It derives ownership from the verified UID,
not a submitted `uid`. Provider secrets and passwords do not belong in source
files or SQLite. Public Firebase web configuration is not an admin credential.

## Guests and data protection

Guests use a random 30-day HttpOnly, SameSite=Strict cookie, Secure on HTTPS.
Only its hash identifies stored guest data. Losing the cookie loses access to
that guest history. Authentication failure must not silently become guest access.

Database writes check their origin and a custom client header. SQL uses bound
parameters; history ownership scopes reads and deletes. Spreadsheet exports
treat text as text rather than executable formulas.

## Practical limits

Dashboard link gating is an interface flow, not backend access enforcement.
The upload endpoint is not currently a production authorization or rate-limit
system. Use HTTPS and perform a deployment security review before public use.
Never weaken operating-system controls to load a blocked binary.
