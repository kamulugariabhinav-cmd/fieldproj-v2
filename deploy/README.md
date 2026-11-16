# Free VM deployment (prepared, not yet provisioned)

Target: Oracle Always Free `VM.Standard.A1.Flex`, Ubuntu 24.04 ARM,
2 OCPUs, 12 GB RAM, 100 GB boot disk, in the account's home region.
Use only resources explicitly marked Always Free and verify the displayed cost.
Current limits: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
Capacity can be unavailable, and Oracle can reclaim idle free VMs. This is a
best-effort academic/demo deployment, without a production availability guarantee.

Account signup and card/identity verification must be completed by the owner.
Do not upgrade to a paid account or allocate paid shapes to resolve capacity.
Never send passwords, card details, API tokens, or SSH private keys in chat.

## Once the VM is available

Install Git and Docker Engine with the Compose plugin using Docker's official
Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/
Allow inbound TCP 80 and 443 in the OCI network and the VM firewall. Restrict
SSH to the owner's IP. Port 8000 is internal to the Compose network.

Clone the repository and run:

```sh
git clone https://github.com/kamulugariabhinav-cmd/fieldproj-v2.git
cd fieldproj-v2
# Use a hostname pointing to this VM. With no owned domain, PUBLIC_IP.sslip.io
# is a third-party free DNS option; verify DNS resolves to your VM first.
export SERVER_NAME=YOUR_BACKEND_HOSTNAME
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml --profile setup run --rm init
docker compose -f deploy/compose.yaml up -d app https
```

Initialization downloads the pinned Pella and NII releases and the existing
Forensics and official ProSDD ASVspoof2019 recovery scripts, then runs actual
inference on two labeled project samples per model. No random-weight fallback
is used. ProSDD's publisher has not supplied a reference checksum; its download
script records a local checksum and the model still undergoes strict loading.
Initialization can take a long time; do not start serving until it succeeds.

The container runs the full frontend/backend with `backend_with_pella_nii.py`.
Persistent Docker volumes hold checkpoints, the Hugging Face cache, SQLite user
data, and TLS state. Preserve and back up these volumes. Do not use
`docker compose down -v` during updates.

Set `VOICEGUARD_BACKEND_ORIGIN=https://YOUR_BACKEND_HOSTNAME` in Vercel and
redeploy the frontend. The browser keeps using the Vercel origin for API calls.
Verify `/api/health`, `/api/addon/status`, real inference for every model,
Firebase sign-in, history, exports, and microphone recording through Vercel.
Add the Vercel domains to Firebase Authentication's authorized domains.

## Validation limits

The Docker configuration and ARM runtime have not yet been built or tested on
a cloud VM. Local route/build tests are not evidence of cloud model readiness.
The 12 GB memory allowance is a deployment target, not a measured ARM peak-RAM
guarantee. The app serializes model requests; concurrent user workloads queue.
