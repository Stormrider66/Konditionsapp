#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || process.env.K6_SUMMARY_EXPORT;

if (!inputPath) {
  console.error('Usage: node load-tests/k6/check-hockey-pilot-summary.cjs <summary.json>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Summary file not found: ${resolvedPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
const metrics = summary.metrics || {};

function nonNegativeFloatEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    console.error(`${name} must be a non-negative number.`);
    process.exit(1);
  }
  return value;
}

const weights = {
  read: nonNegativeFloatEnv('HOCKEY_PILOT_READ_WEIGHT', 0.40),
  athlete: nonNegativeFloatEnv('HOCKEY_PILOT_ATHLETE_WEIGHT', 0.25),
  dashboard: nonNegativeFloatEnv('HOCKEY_PILOT_DASHBOARD_WEIGHT', 0.20),
  export: nonNegativeFloatEnv('HOCKEY_PILOT_EXPORT_WEIGHT', 0.15),
};

const flowEndpoints = {
  read: ['hockey-tests-list', 'hockey-package', 'hockey-athlete-summary'],
  athlete: ['athlete-calendar', 'daily-metrics-get', 'daily-metrics-post'],
  dashboard: ['business-stats', 'team-dashboard'],
  export: ['hockey-simca-export'],
};

function defaultRequiredEndpoints() {
  const endpoints = new Set();
  for (const [flow, flowWeight] of Object.entries(weights)) {
    if (flowWeight > 0) {
      for (const endpoint of flowEndpoints[flow] || []) endpoints.add(endpoint);
    }
  }
  return endpoints;
}

function requiredEndpoints() {
  const raw = process.env.HOCKEY_PILOT_REQUIRED_ENDPOINTS;
  if (raw == null || raw.trim() === '') return defaultRequiredEndpoints();
  if (raw.trim().toLowerCase() === 'none') return new Set();
  return new Set(raw.split(',').map(endpoint => endpoint.trim()).filter(Boolean));
}

const required = requiredEndpoints();

const overallGates = [
  { label: 'overall fail rate', metric: 'http_req_failed', field: 'rate', max: 0.015, format: 'percent' },
  { label: 'overall p95', metric: 'http_req_duration', field: 'p(95)', max: 2000, format: 'ms' },
  { label: 'overall p99', metric: 'http_req_duration', field: 'p(99)', max: 5000, format: 'ms' },
];

const endpointLimits = {
  'business-stats': { p95: 1500, p99: 3500, failRate: 0.01 },
  'team-dashboard': { p95: 1500, p99: 3500, failRate: 0.01 },
  'hockey-tests-list': { p95: 1800, p99: 4000, failRate: 0.01 },
  'hockey-package': { p95: 1500, p99: 3500, failRate: 0.01 },
  'hockey-athlete-summary': { p95: 1500, p99: 3500, failRate: 0.01 },
  'athlete-calendar': { p95: 1800, p99: 4000, failRate: 0.01 },
  'daily-metrics-get': { p95: 1000, p99: 2500, failRate: 0.01 },
  'daily-metrics-post': { p95: 1200, p99: 3000, failRate: 0.01 },
  'hockey-simca-export': { p95: 3000, p99: 6000, failRate: 0.02 },
};

function endpointGates() {
  return Object.entries(endpointLimits).flatMap(([endpoint, limits]) => {
    const optional = !required.has(endpoint);
    return [
      {
        label: `${endpoint} p95`,
        metric: `endpoint_duration{endpoint:${endpoint}}`,
        field: 'p(95)',
        max: limits.p95,
        format: 'ms',
        optional,
      },
      {
        label: `${endpoint} p99`,
        metric: `endpoint_duration{endpoint:${endpoint}}`,
        field: 'p(99)',
        max: limits.p99,
        format: 'ms',
        optional,
      },
      {
        label: `${endpoint} fail rate`,
        metric: `endpoint_failed{endpoint:${endpoint}}`,
        field: 'rate',
        max: limits.failRate,
        format: 'percent',
        optional,
      },
    ];
  });
}

const gates = [...overallGates, ...endpointGates()];

function metricValue(name, field) {
  const entry = metrics[name];
  if (!entry || !entry.values) return null;
  return entry.values[field] ?? null;
}

function formatValue(value, format) {
  if (value == null || Number.isNaN(value)) return '-';
  if (format === 'percent') return `${(Number(value) * 100).toFixed(2)}%`;
  if (format === 'ms') return `${Number(value).toFixed(0)}ms`;
  return String(value);
}

let failures = 0;

console.log(`Hockey pilot summary gate: ${resolvedPath}`);
console.log(`Required endpoints: ${required.size ? Array.from(required).join(', ') : 'none'}`);
console.log('');

for (const gate of gates) {
  const value = metricValue(gate.metric, gate.field);
  if (value == null) {
    const status = gate.optional ? 'SKIP' : 'FAIL';
    if (!gate.optional) failures++;
    console.log(`${status.padEnd(5)} ${gate.label.padEnd(30)} missing`);
    continue;
  }

  const passed = value <= gate.max;
  if (!passed) failures++;
  console.log([
    (passed ? 'PASS' : 'FAIL').padEnd(5),
    gate.label.padEnd(30),
    formatValue(value, gate.format).padStart(10),
    '<=',
    formatValue(gate.max, gate.format),
  ].join(' '));
}

console.log('');
if (failures > 0) {
  console.error(`Hockey pilot summary gate failed (${failures} failure${failures === 1 ? '' : 's'}).`);
  process.exit(1);
}

console.log('Hockey pilot summary gate passed.');
