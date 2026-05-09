#!/usr/bin/env node
/**
 * k6 runner that loads load-tests/.env.k6 and passes vars to k6.
 *
 * Usage: node load-tests/k6/run.cjs <script>
 * Example: node load-tests/k6/run.cjs smoke
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readPlan: readHockeyPilotWavePlan } = require('../../scripts/qa-hockey-pilot-wave-plan.cjs');

function quoteArg(value) {
  return value.includes(' ') ? `"${value}"` : value;
}

function normalizeEnvValue(rawValue) {
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  const inlineCommentIndex = value.search(/\s#/);
  if (inlineCommentIndex !== -1) {
    value = value.slice(0, inlineCommentIndex).trim();
  }

  return value;
}

function summarySidecarPath(summaryPath, suffix) {
  const resolved = path.resolve(process.cwd(), summaryPath);
  const ext = path.extname(resolved);
  const base = ext ? resolved.slice(0, -ext.length) : resolved;
  return `${base}.${suffix}.txt`;
}

function summaryManifestPath(summaryPath) {
  const resolved = path.resolve(process.cwd(), summaryPath);
  const ext = path.extname(resolved);
  const base = ext ? resolved.slice(0, -ext.length) : resolved;
  return `${base}.manifest.json`;
}

function summaryEvidencePath(summaryPath, env) {
  if (env.HOCKEY_PILOT_EVIDENCE_OUTPUT && env.HOCKEY_PILOT_EVIDENCE_OUTPUT.trim()) {
    return path.resolve(process.cwd(), env.HOCKEY_PILOT_EVIDENCE_OUTPUT.trim());
  }

  const resolved = path.resolve(process.cwd(), summaryPath);
  const ext = path.extname(resolved);
  const base = ext ? resolved.slice(0, -ext.length) : resolved;
  return `${base}.md`;
}

function runReportCommand(label, command, outputPath, env) {
  console.log(`\nRunning ${label}...\n`);

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env,
    });
    process.stdout.write(output);
    fs.writeFileSync(outputPath, output);
    console.log(`\nSaved ${label} output: ${outputPath}`);
    return { ok: true, status: 0 };
  } catch (e) {
    const stdout = e.stdout ? String(e.stdout) : '';
    const stderr = e.stderr ? String(e.stderr) : '';
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    fs.writeFileSync(outputPath, `${stdout}${stderr}`);
    console.error(`\nSaved ${label} output: ${outputPath}`);
    return { ok: false, status: e.status || 1 };
  }
}

function firstSetEnv(env, keys) {
  for (const key of keys) {
    if (env[key]) return key;
  }
  return null;
}

function listEnv(value) {
  return (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function gitOutput(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    }).trim();
  } catch {
    return null;
  }
}

function gitSnapshot(env) {
  const commitSha = env.GIT_COMMIT_SHA || gitOutput('git rev-parse HEAD');
  const branch = env.GIT_BRANCH || gitOutput('git rev-parse --abbrev-ref HEAD');
  if (env.GIT_TREE_DIRTY === 'true' || env.GIT_TREE_DIRTY === 'false') {
    return {
      commitSha: commitSha || null,
      branch: branch || null,
      dirty: env.GIT_TREE_DIRTY === 'true',
    };
  }
  const dirtyStatus = gitOutput('git status --short');
  return {
    commitSha: commitSha || null,
    branch: branch || null,
    dirty: dirtyStatus === null ? null : dirtyStatus.length > 0,
  };
}

function writeHockeyPilotManifest({ manifestPath, summaryExport, analyzerOutput, gateOutput, env, result }) {
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(hockeyPilotManifest({ manifestPath, summaryExport, analyzerOutput, gateOutput, env, result }), null, 2)}\n`
  );
  console.log(`\nSaved hockey pilot manifest: ${manifestPath}`);
  writeHockeyPilotEvidence({ manifestPath, summaryExport, env });
}

function writeHockeyPilotEvidence({ manifestPath, summaryExport, env }) {
  if (env.HOCKEY_PILOT_EVIDENCE_OUTPUT === 'skip') return;

  const evidencePath = summaryEvidencePath(summaryExport, env);
  const evidenceScriptPath = path.join(__dirname, '..', '..', 'scripts', 'hockey-pilot-evidence.cjs');
  try {
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    const output = execSync(
      `node ${quoteArg(evidenceScriptPath)} ${quoteArg(manifestPath)} ${quoteArg(evidencePath)}`,
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env,
      }
    );
    process.stdout.write(output);
  } catch (e) {
    const stdout = e.stdout ? String(e.stdout) : '';
    const stderr = e.stderr ? String(e.stderr) : '';
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.warn(`Warning: failed to write hockey pilot evidence note: ${e.message || e}`);
  }
}

function hockeyPilotManifest({ manifestPath, summaryExport, analyzerOutput, gateOutput, env, result }) {
  const wavePlan = readHockeyPilotWavePlan(env);
  return {
    createdAt: new Date().toISOString(),
    script: scriptName,
    result,
    gateModes: listEnv(env.HOCKEY_PILOT_GATE_MODES),
    git: gitSnapshot(env),
    target: env.BASE_URL || null,
    businessId: env.BUSINESS_ID || null,
    businessSlug: env.BUSINESS_SLUG || null,
    teamId: env.TEAM_ID || null,
    clientIdCount: (env.CLIENT_IDS || env.CLIENT_ID || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean).length,
    coachAuthMode: firstSetEnv(env, ['AUTH_COOKIE', 'BEARER_TOKEN', 'LOAD_TEST_BYPASS_USER_EMAIL']) || 'missing',
    athleteAuthMode: firstSetEnv(env, ['ATHLETE_AUTH_COOKIE', 'ATHLETE_BEARER_TOKEN', 'ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL']) || 'missing',
    wavePlan,
    weights: {
      read: env.HOCKEY_PILOT_READ_WEIGHT || '0.40',
      athlete: env.HOCKEY_PILOT_ATHLETE_WEIGHT || '0.25',
      dashboard: env.HOCKEY_PILOT_DASHBOARD_WEIGHT || '0.20',
      export: env.HOCKEY_PILOT_EXPORT_WEIGHT || '0.15',
    },
    loadProfile: {
      warmVus: env.HOCKEY_PILOT_WARM_VUS || '10',
      steadyVus: env.HOCKEY_PILOT_STEADY_VUS || '35',
      peakVus: env.HOCKEY_PILOT_PEAK_VUS || '75',
      warmDuration: env.HOCKEY_PILOT_WARM_DURATION || '2m',
      steadyDuration: env.HOCKEY_PILOT_STEADY_DURATION || '6m',
      peakDuration: env.HOCKEY_PILOT_PEAK_DURATION || '4m',
      rampDownDuration: env.HOCKEY_PILOT_RAMP_DOWN_DURATION || '2m',
    },
    support: {
      notesUrl: env.HOCKEY_PILOT_SUPPORT_NOTES_URL || null,
      openCriticalIssues: env.HOCKEY_PILOT_OPEN_CRITICAL_ISSUES || '0',
      owner: env.HOCKEY_PILOT_SUPPORT_OWNER || null,
    },
    artifacts: {
      summaryJson: path.resolve(process.cwd(), summaryExport),
      analyzerOutput,
      gateOutput,
      manifestJson: manifestPath,
      evidenceMarkdown: summaryEvidencePath(summaryExport, env),
    },
  };
}

const scriptName = process.argv[2];
if (!scriptName) {
  console.error('Usage: node load-tests/k6/run.cjs <smoke|baseline|stress|prod-shape|hockey-pilot>');
  process.exit(1);
}

const scriptPath = path.join(__dirname, `${scriptName}.js`);
if (!fs.existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(1);
}

const envFile = process.env.K6_ENV_PATH
  ? path.resolve(process.cwd(), process.env.K6_ENV_PATH)
  : path.join(__dirname, '..', '.env.k6');
if (!fs.existsSync(envFile)) {
  console.error(`Missing ${envFile} — run: node scripts/grab-auth-cookie.cjs`);
  process.exit(1);
}

if (scriptName === 'hockey-pilot') {
  const preflightPath = path.join(__dirname, '..', '..', 'scripts', 'qa-hockey-pilot-env.cjs');
  console.log('Running hockey pilot env preflight...\n');
  try {
    execSync(`node ${quoteArg(preflightPath)}`, {
      stdio: 'inherit',
      shell: true,
    });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

// Parse .env.k6
const envVars = fs
  .readFileSync(envFile, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const eq = line.indexOf('=');
    if (eq === -1) return ['', ''];
    return [line.substring(0, eq).trim(), normalizeEnvValue(line.substring(eq + 1))];
  });

// Prefer passing vars via the process env rather than `k6 -e ...` flags.
// On Windows, long command lines and `%` expansions (from URL-encoded cookies) can corrupt args.
const envObj = {};
for (const [k, v] of envVars) {
  if (k) envObj[k] = v;
}
const runtimeEnv = { ...envObj, ...process.env };

const defaultK6Bin = 'C:\\Program Files\\k6\\k6.exe';
const configuredK6Bin = process.env.K6_BIN && process.env.K6_BIN.trim();
const k6Bin = configuredK6Bin || (fs.existsSync(defaultK6Bin) ? defaultK6Bin : 'k6');
const quotedK6Bin = quoteArg(k6Bin);

// Optional: write machine-readable summary to JSON.
// This is more reliable than scraping console output (progress uses carriage returns).
const summaryExport = runtimeEnv.K6_SUMMARY_EXPORT && runtimeEnv.K6_SUMMARY_EXPORT.trim();
if (summaryExport) {
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), summaryExport)), { recursive: true });
}
const summaryFlag = summaryExport
  ? `--summary-export ${quoteArg(summaryExport)}`
  : '';

const cmd = `${quotedK6Bin} run ${summaryFlag} ${scriptPath}`;
console.log(`Running: ${k6Bin} run [...env] ${scriptPath}\n`);

let k6ExitCode = 0;
try {
  execSync(cmd, { stdio: 'inherit', shell: true, env: runtimeEnv });
} catch (e) {
  k6ExitCode = e.status || 1;
  const canAnalyzeFailedRun = scriptName === 'hockey-pilot' &&
    summaryExport &&
    fs.existsSync(path.resolve(process.cwd(), summaryExport));

  if (!canAnalyzeFailedRun) {
    process.exit(k6ExitCode);
  }

  console.warn(`k6 exited with code ${k6ExitCode}, but a summary JSON exists. Continuing with hockey pilot evidence capture.`);
}

if (scriptName === 'hockey-pilot' && summaryExport) {
  const analyzerPath = path.join(__dirname, 'analyze-summary.cjs');
  const summaryGatePath = path.join(__dirname, 'check-hockey-pilot-summary.cjs');
  const analyzerOutput = summarySidecarPath(summaryExport, 'analyzer');
  const gateOutput = summarySidecarPath(summaryExport, 'gate');
  const manifestPath = summaryManifestPath(summaryExport);

  const analyzerResult = runReportCommand(
    'k6 summary analyzer',
    `node ${quoteArg(analyzerPath)} ${quoteArg(summaryExport)}`,
    analyzerOutput,
    runtimeEnv
  );
  if (!analyzerResult.ok) {
    writeHockeyPilotManifest({
      manifestPath,
      summaryExport,
      analyzerOutput,
      gateOutput,
      env: runtimeEnv,
      result: {
        status: 'failed',
        failedStep: k6ExitCode ? 'k6+analyzer' : 'analyzer',
        exitCode: analyzerResult.status,
        k6ExitCode,
      },
    });
    process.exit(analyzerResult.status);
  }

  const gateResult = runReportCommand(
    'hockey pilot summary gate',
    `node ${quoteArg(summaryGatePath)} ${quoteArg(summaryExport)}`,
    gateOutput,
    runtimeEnv
  );
  if (!gateResult.ok) {
    writeHockeyPilotManifest({
      manifestPath,
      summaryExport,
      analyzerOutput,
      gateOutput,
      env: runtimeEnv,
      result: {
        status: 'failed',
        failedStep: k6ExitCode ? 'k6+summary-gate' : 'summary-gate',
        exitCode: gateResult.status,
        k6ExitCode,
      },
    });
    process.exit(gateResult.status);
  }

  writeHockeyPilotManifest({
    manifestPath,
    summaryExport,
    analyzerOutput,
    gateOutput,
    env: runtimeEnv,
    result: {
      status: k6ExitCode ? 'failed' : 'passed',
      failedStep: k6ExitCode ? 'k6' : null,
      exitCode: k6ExitCode,
      k6ExitCode,
    },
  });

  if (k6ExitCode) process.exit(k6ExitCode);
}
