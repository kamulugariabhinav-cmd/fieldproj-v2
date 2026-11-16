# Deploy the same VoiceGuard interface as localhost

The complete application is `backend_with_pella_nii.py`. The root `index.html`
is a template, not the finished homepage or dashboard. The Vercel build now uses
the same page and script renderers as FastAPI, exports the homepage, dashboard,
support pages, fonts, animations and styles, and publishes only public assets.
Backend Python code remains in this repository; it is not a static web asset.

## Vercel frontend

Import `kamulugariabhinav-cmd/fieldproj-v2`, branch `main`, repository root.
Use Framework Preset **Other**, build command `npm run build`, and remove any
project-level Output Directory override. The build writes the Vercel Build Output
API directory `.vercel/output`; do not publish the repository root.
The build requires Python 3 but does not install or import ML packages.

Set `VOICEGUARD_BACKEND_ORIGIN` to the public HTTPS origin of the Cloudflare
tunnel (no trailing path), then redeploy. Requests to `/api/*`, `/health` and
`/detect` are forwarded with their original paths. Pages and assets stay on
Vercel. If this variable is absent the frontend still builds, but API routes
return 503 and never fabricate detection results. Localhost/private addresses
are rejected because Vercel cannot connect to your laptop through them.

Add your Vercel domain to Firebase Authentication's authorized domains for sign-in.

## Backend through Cloudflare

Run `Start-VoiceGuard.ps1` on the laptop. Confirm
`http://127.0.0.1:8001/health` and `/api/addon/status`.
The isolated runtime, actual trained checkpoints, and recovery scripts described
in `README.md` must remain installed. Do not upload the environments, private
SQLite user database, credentials, or downloaded multi-GB checkpoints to GitHub
or Vercel. No model uses random weights as a fallback.

For an installed `cloudflared`, a temporary tunnel is:

```powershell
cloudflared tunnel --url http://127.0.0.1:8001
```

Use the printed HTTPS origin as `VOICEGUARD_BACKEND_ORIGIN`. A quick tunnel URL
changes when restarted. A named Cloudflare Tunnel with your own hostname is
preferable for a stable deployment. The laptop, FastAPI process, and tunnel
must stay running; Cloudflare Tunnel forwards traffic and does not host models.

Before calling the deployment complete, verify the Vercel homepage, dashboard,
`/api/health`, sign-in, and real audio inference using each of the four models.
