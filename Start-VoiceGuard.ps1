$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:VOICEGUARD_INFERENCE_PYTHON = Join-Path $PSScriptRoot '.runtime-py311\Scripts\python.exe'
$env:VOICEGUARD_EXPORT_PYTHON = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$env:HOST = '127.0.0.1'
$env:PORT = '8001'
& (Join-Path $PSScriptRoot '.venv\Scripts\python.exe') -B backend_with_pella_nii.py
exit $LASTEXITCODE
