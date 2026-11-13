# VoiceGuard verification

Run focused checks from the project root:

```powershell
python -B -m pytest voiceguard_addon/test_addon.py voiceguard_addon/test_homepage.py voiceguard_addon/test_database.py -q -p no:cacheprovider
node voiceguard_addon/test_homepage_client.js
node voiceguard_addon/test_signin_client.js
node voiceguard_addon/test_storage_client.js
node voiceguard_addon/test_scanner_client.js
node voiceguard_addon/test_signal_motion.js
node voiceguard_addon/test_presentation_client.js
node voiceguard_addon/test_liquid_client.js
```

The API checks cover routing, assets, input limits, ownership, deletion,
exports, and explicit errors. Client checks use mocked DOM/SDK behavior and
do not replace real browser testing.

For heavy, real inference checks:

```powershell
python -B -m voiceguard_addon.validate_recovered
python -B -m voiceguard_addon.validate_live_models
```

The second command requires the local server running. These commands reload
large models; run them when checkpoints or inference behavior change.

Recorded evidence includes eight successful real HTTP uploads, two supplied
samples per model, and a ProSDD inference after restart. Reports are under
`voiceguard_addon/recovery/`. These are smoke checks, not a representative
accuracy benchmark. Actual OAuth login, representative evaluation, and browser
visual QA remain distinct verification tasks.
