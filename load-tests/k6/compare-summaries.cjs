#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const beforeArg = process.argv[2];
const afterArg = process.argv[3];

if (!beforeArg || !afterArg) {
  console.error('Usage: node load-tests/k6/compare-summaries.js <before.json> <after.json>');
  process.exit(1);
}

function loadSummary(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Summary file not found: ${resolved}`);
  }
  const summary = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return {
    path: resolved,
    metrics: summary.metrics || {},
    state: summary.state || {},
  };
}

function metricValue(summary, name, field) {
  const entry = summary.metrics[name];
  if (!entry || !entry.values) return null;
  return entry.values[field] ?? null;
}

function taggedMetricValue(summary, baseName, endpoint, field) {
  return metricValue(summary, `${baseName}{endpoint:${endpoint}}`, field);
}

function collectEndpoints(...summaries) {
  const endpoints = new Set();
  for (const summary of summaries) {
    for (const key of Object.keys(summary.metrics)) {
      const match = key.match(/\{endpoint:([^}]+)\}/);
      if (match) endpoints.add(match[1]);
    }
  }
  return Array.from(endpoints).sort();
}

function formatMs(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Number(value).toFixed(0)}ms`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatReqRate(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Number(value).toFixed(2)} req/s`;
}

function formatDelta(before, after, kind) {
  if (before == null || after == null || Number.isNaN(before) || Number.isNaN(after)) return '-';
  const delta = after - before;
  if (kind === 'percent') {
    return `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp`;
  }
  if (kind === 'rate') {
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} req/s`;
  }
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}ms`;
}

function printSummaryOverview(label, summary) {
  console.log(label);
  console.log(`  file: ${summary.path}`);
  console.log(`  http_req_failed: ${formatPercent(metricValue(summary, 'http_req_failed', 'rate'))}`);
  console.log(`  http_req_duration p95: ${formatMs(metricValue(summary, 'http_req_duration', 'p(95)'))}`);
  console.log(`  http_req_duration p99: ${formatMs(metricValue(summary, 'http_req_duration', 'p(99)'))}`);
  console.log(`  http_reqs rate: ${formatReqRate(metricValue(summary, 'http_reqs', 'rate'))}`);
}

const before = loadSummary(beforeArg);
const after = loadSummary(afterArg);
const endpoints = collectEndpoints(before, after);

printSummaryOverview('Before', before);
console.log('');
printSummaryOverview('After', after);

console.log('');
console.log('Overall Delta');
console.log(`  http_req_failed: ${formatDelta(metricValue(before, 'http_req_failed', 'rate'), metricValue(after, 'http_req_failed', 'rate'), 'percent')}`);
console.log(`  http_req_duration p95: ${formatDelta(metricValue(before, 'http_req_duration', 'p(95)'), metricValue(after, 'http_req_duration', 'p(95)'), 'ms')}`);
console.log(`  http_req_duration p99: ${formatDelta(metricValue(before, 'http_req_duration', 'p(99)'), metricValue(after, 'http_req_duration', 'p(99)'), 'ms')}`);
console.log(`  http_reqs rate: ${formatDelta(metricValue(before, 'http_reqs', 'rate'), metricValue(after, 'http_reqs', 'rate'), 'rate')}`);

if (endpoints.length === 0) {
  console.log('');
  console.log('No tagged endpoint metrics found.');
  process.exit(0);
}

console.log('');
console.log('Per Endpoint Delta');
console.log([
  'Endpoint'.padEnd(22),
  'p95 Δ'.padStart(10),
  'p99 Δ'.padStart(10),
  'fail Δ'.padStart(10),
  'hit Δ'.padStart(10),
  'stale Δ'.padStart(10),
  'miss Δ'.padStart(10),
].join(' '));

for (const endpoint of endpoints) {
  const p95Delta = formatDelta(
    taggedMetricValue(before, 'endpoint_duration', endpoint, 'p(95)'),
    taggedMetricValue(after, 'endpoint_duration', endpoint, 'p(95)'),
    'ms'
  );
  const p99Delta = formatDelta(
    taggedMetricValue(before, 'endpoint_duration', endpoint, 'p(99)'),
    taggedMetricValue(after, 'endpoint_duration', endpoint, 'p(99)'),
    'ms'
  );
  const failDelta = formatDelta(
    taggedMetricValue(before, 'endpoint_failed', endpoint, 'rate'),
    taggedMetricValue(after, 'endpoint_failed', endpoint, 'rate'),
    'percent'
  );
  const hitDelta = formatDelta(
    taggedMetricValue(before, 'endpoint_cache_hit', endpoint, 'rate'),
    taggedMetricValue(after, 'endpoint_cache_hit', endpoint, 'rate'),
    'percent'
  );
  const staleDelta = formatDelta(
    taggedMetricValue(before, 'endpoint_cache_stale', endpoint, 'rate'),
    taggedMetricValue(after, 'endpoint_cache_stale', endpoint, 'rate'),
    'percent'
  );
  const missDelta = formatDelta(
    taggedMetricValue(before, 'endpoint_cache_miss', endpoint, 'rate'),
    taggedMetricValue(after, 'endpoint_cache_miss', endpoint, 'rate'),
    'percent'
  );

  console.log([
    endpoint.padEnd(22),
    p95Delta.padStart(10),
    p99Delta.padStart(10),
    failDelta.padStart(10),
    hitDelta.padStart(10),
    staleDelta.padStart(10),
    missDelta.padStart(10),
  ].join(' '));
}
