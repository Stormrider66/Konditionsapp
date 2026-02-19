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
const envVars = fs
  .readFileSync(envFile, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const eq = line.indexOf('=');
    return [line.substring(0, eq), line.substring(eq + 1)];
  });

// Prefer passing vars via the process env rather than `k6 -e ...` flags.
// On Windows, long command lines and `%` expansions (from URL-encoded cookies) can corrupt args.
const envObj = {};
for (const [k, v] of envVars) {
  if (k) envObj[k] = v;
}

const defaultK6Bin = 'C:\\Program Files\\k6\\k6.exe';
const configuredK6Bin = process.env.K6_BIN && process.env.K6_BIN.trim();
const k6Bin = configuredK6Bin || (fs.existsSync(defaultK6Bin) ? defaultK6Bin : 'k6');
const quotedK6Bin = k6Bin.includes(' ') ? `"${k6Bin}"` : k6Bin;

// Optional: write machine-readable summary to JSON.
// This is more reliable than scraping console output (progress uses carriage returns).
const summaryExport = process.env.K6_SUMMARY_EXPORT && process.env.K6_SUMMARY_EXPORT.trim();
const summaryFlag = summaryExport
  ? `--summary-export ${summaryExport.includes(' ') ? `"${summaryExport}"` : summaryExport}`
  : '';

const cmd = `${quotedK6Bin} run ${summaryFlag} ${scriptPath}`;
console.log(`Running: ${k6Bin} run [...env] ${scriptPath}\n`);

try {
  execSync(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, ...envObj } });
} catch (e) {
  process.exit(e.status || 1);
}
