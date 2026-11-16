// Export the same pages and scripts served by backend_with_pella_nii.py.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const local = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const python = process.env.PYTHON || (fs.existsSync(local) ? local : 'python3');
const result = spawnSync(python, ['-B', '-m', 'voiceguard_addon.build_frontend'], {
  cwd: __dirname, stdio: 'inherit', env: process.env,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
