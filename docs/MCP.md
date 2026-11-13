# External development tools

## Current application

VoiceGuard does not require an MCP server at runtime. Its browser communicates
with FastAPI and Firebase. Model recovery uses publisher download sources;
model workers run locally.

## Appropriate development use

External tools may assist with source inspection, official documentation,
visual QA, repository access, or runtime dependency discovery. Use the relevant
connected tool when available and keep actions within the user's authorization.

Do not place MCP credentials or personal account tokens in the browser bundle,
database, or repository. Use secret-management facilities supplied by the tool.
Do not add an external integration merely because a tool is installed.

Browser access to localhost has previously been denied by a saved permission
setting. Do not bypass that denial using a different browser surface or shell
automation. Continue permitted source, API, and mocked-client checks and report
the visual-verification limitation.

Before adding an MCP-dependent workflow, document the concrete capability,
required access, transmitted data, failure behavior, and a local fallback in
INTEGRATIONS.md. No additional external connection is configured by this file.
