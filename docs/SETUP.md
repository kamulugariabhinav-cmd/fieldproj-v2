# VoiceGuard local setup

Run commands from the project root in PowerShell.

## Existing installation

```powershell
python backend_with_pella_nii.py
```

Default host is `127.0.0.1`; default port is `8001`. `HOST` and `PORT` override
these values. Environment variables must be set in the launching process;
the launcher does not automatically load a `.env` file.

## Recreating dependencies

The web service uses the existing root requirements. The isolated model runtime
was verified with CPU PyTorch 2.5.1 and Transformers 4.44.2:

```powershell
python -m pip install -r requirements.txt
python -m venv voiceguard_addon/.inference-env
& ./voiceguard_addon/.inference-env/Scripts/python.exe -m pip install -r voiceguard_addon/inference-requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
```

Model dependencies belong in the isolated runtime. Verify imports and NumPy
interoperability before restoring its readiness marker; do not fabricate a
ready file. Consult the existing `voiceguard_addon/README.md` and recovery report
for checkpoint recovery and real inference checks.

`VOICEGUARD_INFERENCE_PYTHON` selects the model executable. Document exports use
the configured bundled runtime or `VOICEGUARD_EXPORT_PYTHON`, with packages from
`voiceguard_addon/export-requirements.txt`. Firebase uses the existing public
project configuration; private provider secrets stay in Firebase Console.
