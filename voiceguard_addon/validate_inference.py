"""Actual multipart upload smoke checks; not an accuracy benchmark."""
import hashlib
import json
from pathlib import Path

from fastapi.testclient import TestClient
from voiceguard_addon.app import app

ROOT = Path(__file__).resolve().parent.parent


def main():
    client = TestClient(app)
    results = []
    for model in ("pella", "nii"):
        for group in ("bonafide", "spoof"):
            path = next((ROOT / "dataset" / group).glob("*.wav"))
            response = client.post("/api/detect", data={"model": model},
                                   files={"audio": (path.name, path.read_bytes(), "audio/wav")})
            response.raise_for_status()
            result = response.json()
            assert 0 <= result["ai_probability"] <= 1
            assert abs(result["ai_probability"] + result["human_probability"] - 1) < 1e-6
            assert result["model_name"] == {"pella": "PellaV2", "nii": "NII-AntiDeepfake"}[model]
            results.append({"file": str(path.relative_to(ROOT)), "folder_label": group,
                            "result": result})
            print(model, group, result["prediction"], result["ai_probability"], flush=True)
    originals = json.loads((ROOT / "voiceguard_addon/original_files.sha256.json").read_text(encoding="utf-8-sig"))
    changed = [x["Path"] for x in originals if not Path(x["Path"]).exists() or
               hashlib.sha256(Path(x["Path"]).read_bytes()).hexdigest().upper() != x["Hash"]]
    assert not changed, changed
    report = {"scope": "Multipart inference smoke checks; sample provenance not independently verified; no accuracy claim",
              "original_files_checked": len(originals), "original_files_changed": changed,
              "uploads": results}
    (ROOT / "voiceguard_addon/validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
