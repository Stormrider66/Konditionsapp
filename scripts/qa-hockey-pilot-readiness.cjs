#!/usr/bin/env node
const { spawnSync } = require('child_process');

const checks = [
  {
    label: 'Hockey pilot tooling tests',
    command: 'npm',
    args: ['run', 'qa:hockey-pilot-tooling'],
  },
];

function runCheck(check) {
  console.log(`\n== ${check.label} ==\n`);
  const result = spawnSync(check.command, check.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`\n${check.label} failed.`);
    process.exit(result.status || 1);
  }
}

for (const check of checks) {
  runCheck(check);
}

console.log('\nHockey pilot local readiness checks passed.');
console.log('');
console.log('Before inviting external teams, run the combined gate command against the target environment:');
console.log('- npm run qa:hockey-pilot-gates -- --include-browser');
console.log('- K6_SUMMARY_EXPORT=load-tests/evidence/hockey-pilot-YYYY-MM-DD.json npm run qa:hockey-pilot-gates -- --include-load');
console.log('');
console.log('The load runner saves the summary JSON, analyzer text, gate text, manifest JSON, and evidence note automatically.');
