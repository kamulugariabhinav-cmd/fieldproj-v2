"""Resume and verify the pinned official NII weights into the add-on only."""
import hashlib
import json
import time
from pathlib import Path

import requests

REPO = "nii-yamagishilab/mms-300m-anti-deepfake"
REVISION = "7928e119e09f616b2ce698892e00ca22dbaa40bf"
DIRECTORY = Path(__file__).resolve().parent / "weights" / "nii"


def main():
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    response = requests.get(f"https://huggingface.co/api/models/{REPO}/revision/{REVISION}",
                            params={"blobs": "true"}, timeout=60)
    response.raise_for_status()
    metadata = next(x for x in response.json()["siblings"] if x["rfilename"] == "model.safetensors")
    expected = metadata["lfs"]["sha256"]
    target = DIRECTORY / "model.safetensors"
    partial = DIRECTORY / "model.safetensors.part"
    if not target.exists():
        for attempt in range(5):
            try:
                offset = partial.stat().st_size if partial.exists() else 0
                url = f"https://huggingface.co/{REPO}/resolve/{REVISION}/model.safetensors"
                with requests.get(url, headers={"Range": f"bytes={offset}-"},
                                  stream=True, timeout=(30, 90)) as stream:
                    stream.raise_for_status()
                    append = stream.status_code == 206 and offset > 0
                    with partial.open("ab" if append else "wb") as output:
                        for chunk in stream.iter_content(4 * 1024 * 1024):
                            output.write(chunk)
                break
            except requests.RequestException:
                if attempt == 4:
                    raise
                time.sleep(2 ** attempt)
        candidate = partial
    else:
        candidate = target
    with candidate.open("rb") as checkpoint:
        digest = hashlib.file_digest(checkpoint, "sha256").hexdigest()
    if digest != expected:
        raise RuntimeError("Official NII checkpoint SHA256 mismatch")
    if candidate == partial:
        partial.rename(target)
    config = requests.get(f"https://huggingface.co/{REPO}/resolve/{REVISION}/config.json", timeout=60)
    config.raise_for_status()
    (DIRECTORY / "config.json").write_text(config.text, encoding="utf-8")
    (DIRECTORY / "verification.json").write_text(json.dumps(
        {"repository": REPO, "revision": REVISION, "sha256": digest,
         "bytes": target.stat().st_size}, indent=2), encoding="utf-8")
    print(f"Verified official NII checkpoint: {digest}", flush=True)


if __name__ == "__main__":
    main()
