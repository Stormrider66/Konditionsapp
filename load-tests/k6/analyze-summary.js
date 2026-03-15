#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || process.env.K6_SUMMARY_EXPORT;

if (!inputPath) {
  console.error('Usage: node load-tests/k6/analyze-summary.js <summary.json>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Summary file not found: ${resolvedPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
const metrics = summary.metrics || {};

function metric(name) {
  return metrics[name] || null;
}

function metricValue(name, field) {
  const entry = metric(name);
  if (!entry || !entry.values) return null;
  return entry.values[field] ?? null;
}

function formatMs(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Number(value).toFixed(0)}ms`;
}

function formatSeconds(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Number(value).toFixed(2)}s`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatReqRate(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Number(value).toFixed(2)} req/s`;
}

function getTaggedMetric(baseName, endpoint) {
  return metric(`${baseName}{endpoint:${endpoint}}`);
}

function getTaggedMetricValue(baseName, endpoint, field) {
  const entry = getTaggedMetric(baseName, endpoint);
  if (!entry || !entry.values) return null;
  return entry.values[field] ?? null;
}

function collectEndpoints() {
  const endpoints = new Set();
  for (const key of Object.keys(metrics)) {
    const match = key.match(/\{endpoint:([^}]+)\}/);
    if (match) endpoints.add(match[1]);
  }
  return Array.from(endpoints).sort();
}

function printLine(label, value) {
  console.log(`${label.padEnd(28)} ${value}`);
}

console.log(`k6 summary: ${resolvedPath}`);
console.log('');
console.log('Overall');
printLine('Iterations', String(metricValue('iterations', 'count') ?? '-'));
printLine('HTTP failed', formatPercent(metricValue('http_req_failed', 'rate')));
printLine('HTTP req p95', formatMs(metricValue('http_req_duration', 'p(95)')));
printLine('HTTP req p99', formatMs(metricValue('http_req_duration', 'p(99)')));
printLine('HTTP req avg', formatMs(metricValue('http_req_duration', 'avg')));
printLine('Req rate', formatReqRate(metricValue('http_reqs', 'rate')));
printLine('Duration', formatSeconds(summary.state?.testRunDurationMs != null ? summary.state.testRunDurationMs / 1000 : null));

const endpoints = collectEndpoints();
if (endpoints.length === 0) {
  console.log('');
  console.log('No tagged endpoint metrics found.');
  process.exit(0);
}

console.log('');
console.log('Per Endpoint');
console.log([
  'Endpoint'.padEnd(22),
  'p95'.padStart(8),
  'p99'.padStart(8),
  'fail'.padStart(8),
  'hit'.padStart(8),
  'stale'.padStart(8),
  'miss'.padStart(8),
  'handler'.padStart(10),
  'queue'.padStart(10),
].join(' '));

for (const endpoint of endpoints) {
  const p95 = formatMs(getTaggedMetricValue('endpoint_duration', endpoint, 'p(95)'));
  const p99 = formatMs(getTaggedMetricValue('endpoint_duration', endpoint, 'p(99)'));
  const fail = formatPercent(getTaggedMetricValue('endpoint_failed', endpoint, 'rate'));
  const hit = formatPercent(getTaggedMetricValue('endpoint_cache_hit', endpoint, 'rate'));
  const stale = formatPercent(getTaggedMetricValue('endpoint_cache_stale', endpoint, 'rate'));
  const miss = formatPercent(getTaggedMetricValue('endpoint_cache_miss', endpoint, 'rate'));
  const handler = formatMs(getTaggedMetricValue('endpoint_handler_ms', endpoint, 'p(95)'));
  const queue = formatMs(getTaggedMetricValue('endpoint_next_queue_ms', endpoint, 'p(95)'));

  console.log([
    endpoint.padEnd(22),
    p95.padStart(8),
    p99.padStart(8),
    fail.padStart(8),
    hit.padStart(8),
    stale.padStart(8),
    miss.padStart(8),
    handler.padStart(10),
    queue.padStart(10),
  ].join(' '));
}
