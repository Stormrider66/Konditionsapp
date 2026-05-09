#!/usr/bin/env node
/**
 * Preflight-check load-tests/.env.k6 before running the hockey pilot k6 scenario.
 */

const fs = require('fs');
const path = require('path');
const { readPlan: readWavePlan, validatePlan: validateWavePlan } = require('./qa-hockey-pilot-wave-plan.cjs');

const envPath = process.env.K6_ENV_PATH
  ? path.resolve(process.cwd(), process.env.K6_ENV_PATH)
  : path.join(__dirname, '..', 'load-tests', '.env.k6');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run npm run load:k6:auth first.`);
  }

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(line.slice(separatorIndex + 1));
    if (key) env[key] = value;
  }
  return env;
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

function nonNegativeFloat(value, fallback) {
  if (value == null || value === '') return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function positiveInteger(value, fallback) {
  if (value == null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function listEnv(value) {
  return (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function validateProductionLikeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return 'Pilot load gate target must use https for launch evidence.';
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      return 'Pilot load gate target must be production-like, not localhost.';
    }
    return null;
  } catch {
    return 'BASE_URL is not a valid URL.';
  }
}

function main() {
  const env = { ...parseEnvFile(envPath), ...process.env };
  const errors = [];
  const warnings = [];
  const gateModes = listEnv(env.HOCKEY_PILOT_GATE_MODES);
  const requiresEvidenceExport = gateModes.includes('load');

  for (const key of ['BASE_URL', 'CLIENT_ID', 'BUSINESS_ID', 'TEAM_ID']) {
    if (!env[key]) errors.push(`${key} is required.`);
  }

  if (requiresEvidenceExport && env.BASE_URL) {
    const targetError = validateProductionLikeUrl(env.BASE_URL);
    if (targetError) errors.push(targetError);
  }

  if (!env.AUTH_COOKIE && !env.BEARER_TOKEN && !env.LOAD_TEST_BYPASS_USER_EMAIL) {
    errors.push('Coach/review auth is required: set AUTH_COOKIE, BEARER_TOKEN, or LOAD_TEST_BYPASS_USER_EMAIL.');
  }

  const athleteWeight = nonNegativeFloat(env.HOCKEY_PILOT_ATHLETE_WEIGHT, 0.25);
  const trafficWeights = {
    read: nonNegativeFloat(env.HOCKEY_PILOT_READ_WEIGHT, 0.40),
    athlete: athleteWeight,
    dashboard: nonNegativeFloat(env.HOCKEY_PILOT_DASHBOARD_WEIGHT, 0.20),
    export: nonNegativeFloat(env.HOCKEY_PILOT_EXPORT_WEIGHT, 0.15),
  };
  const totalTrafficWeight = Object.values(trafficWeights).reduce((sum, value) => sum + value, 0);
  const hasAthleteAuth = Boolean(
    env.ATHLETE_AUTH_COOKIE ||
    env.ATHLETE_BEARER_TOKEN ||
    env.ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL
  );
  const coachAuthMode = env.AUTH_COOKIE
    ? 'cookie'
    : env.BEARER_TOKEN
      ? 'bearer'
      : env.LOAD_TEST_BYPASS_USER_EMAIL
        ? 'bypass'
        : 'missing';
  const athleteAuthMode = env.ATHLETE_AUTH_COOKIE
    ? 'cookie'
    : env.ATHLETE_BEARER_TOKEN
      ? 'bearer'
      : env.ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL
        ? 'bypass'
      : 'missing';
  const wavePlan = readWavePlan(env);
  const waveValidation = validateWavePlan(wavePlan);
  const peakVus = positiveInteger(env.HOCKEY_PILOT_PEAK_VUS, 75);

  for (const error of waveValidation.errors) errors.push(error);
  for (const warning of waveValidation.warnings) warnings.push(warning);

  if (Number.isFinite(wavePlan.expectedPeakUsers) && peakVus < wavePlan.expectedPeakUsers) {
    errors.push(`HOCKEY_PILOT_PEAK_VUS is ${peakVus}, but HOCKEY_PILOT_EXPECTED_PEAK_USERS is ${wavePlan.expectedPeakUsers}. Raise peak VUs or lower the expected peak before using this as pilot evidence.`);
  }

  if (totalTrafficWeight <= 0) {
    errors.push('At least one hockey pilot traffic weight must be greater than 0.');
  }

  if (athleteWeight > 0 && !hasAthleteAuth) {
    errors.push('Athlete traffic is enabled but athlete auth is missing. Set ATHLETE_AUTH_COOKIE, ATHLETE_BEARER_TOKEN, ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL, or HOCKEY_PILOT_ATHLETE_WEIGHT=0.');
  }

  if (athleteWeight > 0 && env.ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL && !env.LOAD_TEST_BYPASS_SECRET) {
    errors.push('ATHLETE_LOAD_TEST_BYPASS_USER_EMAIL requires LOAD_TEST_BYPASS_SECRET.');
  }

  const clientIds = (env.CLIENT_IDS || env.CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (athleteWeight > 0 && clientIds.length > 1 && hasAthleteAuth) {
    errors.push('Athlete traffic is enabled with multiple CLIENT_IDS. Use one CLIENT_ID that matches the athlete auth session, or set HOCKEY_PILOT_ATHLETE_WEIGHT=0 for a coach-only run.');
  }

  if (env.BASE_URL && /next dev|localhost:3000\/?$/.test(env.BASE_URL)) {
    warnings.push('Run pilot load tests against a production build or production-like target, not next dev.');
  }

  if (!env.K6_SUMMARY_EXPORT) {
    const message = 'Set K6_SUMMARY_EXPORT=load-tests/hockey-pilot-summary.json so the run saves evidence for review.';
    if (requiresEvidenceExport) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  } else {
    const summaryDir = path.dirname(path.resolve(process.cwd(), env.K6_SUMMARY_EXPORT));
    if (!fs.existsSync(summaryDir)) {
      warnings.push(`K6_SUMMARY_EXPORT directory does not exist yet and will be created by the k6 runner: ${summaryDir}`);
    }
  }

  if (errors.length > 0) {
    console.error('Hockey pilot k6 env failed:');
    for (const error of errors) console.error(`- ${error}`);
    for (const warning of warnings) console.warn(`Warning: ${warning}`);
    process.exitCode = 1;
    return;
  }

  console.log('Hockey pilot k6 env passed.');
  console.log(`Target: ${env.BASE_URL}`);
  console.log(`Coach auth: ${coachAuthMode}`);
  console.log(`Athlete traffic: ${athleteWeight > 0 ? 'enabled' : 'disabled'}`);
  if (athleteWeight > 0) console.log(`Athlete auth: ${athleteAuthMode}`);
  console.log(`Traffic weight total: ${totalTrafficWeight}`);
  console.log(`Client IDs: ${clientIds.length || 0}`);
  console.log(`Pilot users: ${wavePlan.estimatedUsers}`);
  console.log(`Expected peak users: ${wavePlan.expectedPeakUsers}`);
  console.log(`Peak VUs: ${peakVus}`);
  console.log(`Gate modes: ${gateModes.length ? gateModes.join(',') : '-'}`);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
