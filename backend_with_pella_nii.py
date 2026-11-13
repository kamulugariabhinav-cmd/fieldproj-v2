"""Optional launcher: python backend_with_pella_nii.py (default port 8001)."""
import os
import sys

# Avoid generating bytecode files in existing source directories.
sys.dont_write_bytecode = True

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("voiceguard_addon.app:app", host=os.getenv("HOST", "127.0.0.1"),
                port=int(os.getenv("PORT", "8001")))
