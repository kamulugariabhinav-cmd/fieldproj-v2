# VoiceGuard project documentation

Read and maintain these documents in the order requested. File names match the
reference; this index provides the sequence without relocating application code.

| Order | Document | When to use |
|---|---|---|
| 1 | [PRD.md](PRD.md) | Before defining or changing product requirements |
| 2 | [DESIGN.md](DESIGN.md) | After requirements, before changing the interface |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | After design, before implementation decisions |
| 4 | [DATABASE.md](DATABASE.md) | After architecture, before persistence changes |
| 5 | [API.md](API.md) | After database decisions, before API changes |
| 6 | [AGENTS.md](AGENTS.md) | Before agent-assisted documentation work |
| 7 | [README.md](README.md) | For orientation and navigation |
| 8 | [PLAN.md](PLAN.md) | Immediately before implementing a change |
| 9 | [SETUP.md](SETUP.md) | When preparing the development environment |
| 10 | [FEATURES.md](FEATURES.md) | Before adding or modifying a feature |
| 11 | [AUTH_SECURITY.md](AUTH_SECURITY.md) | Before changing identity, access, or data handling |
| 12 | [MCP.md](MCP.md) | When development requires external tools |
| 13 | [INTEGRATIONS.md](INTEGRATIONS.md) | When configuring external services |
| 14 | [TESTING.md](TESTING.md) | When verifying completed work |
| 15 | [DEBUGGING.md](DEBUGGING.md) | Whenever a failure occurs |

## Current application

From the project root, run:

```powershell
python backend_with_pella_nii.py
```

- Homepage: http://127.0.0.1:8001/
- Dashboard: http://127.0.0.1:8001/dashboard
- API schema: http://127.0.0.1:8001/docs

The active local implementation is in `voiceguard_addon/`. It extends the
original project without relocating its source files. The existing root README
and add-on recovery/setup reports are preserved.

These documents describe the implemented local system, not a production
certification. Model sample checks do not establish general accuracy.
