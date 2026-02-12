#!/usr/bin/env node
/**
 * k6 runner that loads load-tests/.env.k6 and passes vars to k6.
 *
 * Usage: node load-tests/k6/run.js <script>
 * Example: node load-tests/k6/run.js smoke
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptName = process.argv[2];
if (!scriptName) {
  console.error('Usage: node load-tests/k6/run.js <smoke|baseline|stress>');
  process.exit(1);
}

const scriptPath = path.join(__dirname, `${scriptName}.js`);
if (!fs.existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(1);
}

const envFile = path.join(__dirname, '..', '.env.k6');
if (!fs.existsSync(envFile)) {
  console.error('Missing load-tests/.env.k6 — run: node scripts/grab-auth-cookie.js');
  process.exit(1);
}

// Parse .env.k6
const envVars = fs.readFileSync(envFile, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const eq = line.indexOf('=');
    return [line.substring(0, eq), line.substring(eq + 1)];
  });

// Build k6 -e flags
const envFlags = envVars.map(([k, v]) => `-e ${k}=${v}`).join(' ');

const defaultK6Bin = 'C:\\Program Files\\k6\\k6.exe';
const configuredK6Bin = process.env.K6_BIN && process.env.K6_BIN.trim();
const k6Bin = configuredK6Bin || (fs.existsSync(defaultK6Bin) ? defaultK6Bin : 'k6');
const quotedK6Bin = k6Bin.includes(' ') ? `"${k6Bin}"` : k6Bin;

const cmd = `${quotedK6Bin} run ${envFlags} ${scriptPath}`;
console.log(`Running: ${k6Bin} run [...env] ${scriptPath}\n`);

try {
  execSync(cmd, { stdio: 'inherit', shell: true });
} catch (e) {
  process.exit(e.status || 1);
}
