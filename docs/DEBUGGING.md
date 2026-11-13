# VoiceGuard troubleshooting

## Website will not open

Confirm `python backend_with_pella_nii.py` is running, then inspect
`voiceguard_addon/server.stderr.log` and `server.stdout.log`.
Use port 8001 for the add-on. Verify the process command before stopping or
restarting it; do not stop unrelated Python processes.

## Analysis fails

Read the backend traceback. Check model selection, trained weight presence,
runtime readiness, and per-model validation reports. A checkpoint file alone
does not prove architecture compatibility. Do not substitute unrelated weights
or run an untrained classifier to suppress the error.

The global runtime previously hit a Windows-blocked torchaudio library. The
isolated inference environment avoids requiring that optional package. Keep the
website independent of eager model imports; do not disable system protections.

## Sign-in or history fails

Check Firebase provider enablement, authorized domains, popup handling, and
network access. Use the User data disclosure for connection/save errors and
Reconnect. Preserve the guest cookie when testing guest persistence. Never
request or log a user's password or provider client secret.

## Interface is stale or animation stops

Reload with Ctrl+F5. Confirm the requested asset version is served. Background
canvases must stay fixed behind content. Check reduced-motion settings,
visibility suspension, and browser-back restoration. Do not bypass a denied
browser permission to investigate.

## Export fails

Check the configured document runtime and export dependencies. Word visual
rendering requires an available renderer; LibreOffice was absent in this session.
