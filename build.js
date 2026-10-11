const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[build.js] Starting VoiceGuard Liquid Glass Production Build...');

const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://fieldproj-v2.onrender.com';
const sanitizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

const configTemplate = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(path.join(publicDir, 'config.js'), configTemplate, 'utf8');
console.log(`[build.js] Verified runtime config.js for production with fallback: ${sanitizedBaseUrl}`);

try {
  console.log('[build.js] Executing vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('[build.js] Vite build completed successfully!');
} catch (e) {
  console.error('[build.js] Vite build failed:', e.message);
  process.exit(1);
}
