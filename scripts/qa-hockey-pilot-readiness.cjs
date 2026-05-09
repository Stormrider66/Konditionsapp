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
console.log('Before inviting external teams, generate the target-environment evidence commands:');
console.log('- npm run qa:hockey-evidence-commands');
console.log('');
console.log('Replace anything listed under "Replace before running", then run the printed browser and load commands against the production-like target.');
console.log('');
console.log('The load runner saves the summary JSON, analyzer text, gate text, manifest JSON, and evidence note automatically.');
