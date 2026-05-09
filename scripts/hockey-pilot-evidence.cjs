#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function usage() {
  console.error('Usage: node scripts/hockey-pilot-evidence.cjs <manifest.json> [output.md]')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readTextIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf8')
}

function metric(summary, name) {
  return summary?.metrics?.[name] || null
}

function metricValue(summary, name, field) {
  const m = metric(summary, name)
  if (!m) return null
  if (m.values && Object.prototype.hasOwnProperty.call(m.values, field)) {
    return m.values[field]
  }
  if (Object.prototype.hasOwnProperty.call(m, field)) {
    return m[field]
  }
  return null
}

function formatMs(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}ms` : '-'
}

function formatRate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '-'
}

function endpointRows(summary) {
  const metrics = summary?.metrics || {}
  return Object.keys(metrics)
    .map((name) => {
      const match = name.match(/^endpoint_duration\{endpoint:([^}]+)\}$/)
      if (!match) return null
      const endpoint = match[1]
      return {
        endpoint,
        p95: metricValue(summary, name, 'p(95)'),
        p99: metricValue(summary, name, 'p(99)'),
        failRate: metricValue(summary, `endpoint_failed{endpoint:${endpoint}}`, 'value'),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.p95 || 0) - (a.p95 || 0))
}

function relativeOrDash(filePath, cwd) {
  if (!filePath) return '-'
  const relative = path.relative(cwd, filePath)
  return relative && !relative.startsWith('..') ? relative : filePath
}

function decisionFromManifest(manifest) {
  if (manifest?.git?.dirty === true) return 'FIX_AND_RERUN'
  if (Number.parseInt(manifest?.support?.openCriticalIssues || '0', 10) > 0) return 'FIX_AND_RERUN'
  if (Number.parseInt(manifest?.support?.slaHours || '24', 10) > 24) return 'FIX_AND_RERUN'
  return manifest?.result?.status === 'passed' ? 'GO' : 'FIX_AND_RERUN'
}

function formatList(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : '-'
}

function buildMarkdown({ manifest, summary, gateText, cwd }) {
  const rows = endpointRows(summary)
  const slowest = rows[0]
  const artifacts = manifest.artifacts || {}
  const result = manifest.result || {}
  const weights = manifest.weights || {}
  const loadProfile = manifest.loadProfile || {}
  const wavePlan = manifest.wavePlan || {}
  const support = manifest.support || {}
  const git = manifest.git || {}
  const createdAt = manifest.createdAt ? new Date(manifest.createdAt) : new Date()
  const gatePassed = /Hockey pilot summary gate passed\./.test(gateText)
  const gateFailed = /Hockey pilot summary gate failed/.test(gateText)
  const gateStatus = gatePassed ? 'passed' : gateFailed ? 'failed' : '-'

  const endpointTable = rows.length
    ? rows
        .map(
          (row) =>
            `| ${row.endpoint} | ${formatMs(row.p95)} | ${formatMs(row.p99)} | ${formatRate(row.failRate)} |`
        )
        .join('\n')
    : '| - | - | - | - |'

  return `# Hockey Pilot Run Evidence

## Run

- Date: ${createdAt.toISOString()}
- Runner: -
- Environment: ${manifest.target || '-'}
- Target URL: ${manifest.target || '-'}
- Commit SHA: ${git.commitSha || '-'}
- Decision: \`${decisionFromManifest(manifest)}\`

## Pilot Shape

- Teams invited: ${wavePlan.teamCount ?? '-'}
- Expected athletes: ${wavePlan.estimatedAthletes ?? '-'}
- Expected coach/staff users: ${wavePlan.estimatedStaff ?? '-'}
- Busy window tested: ${wavePlan.expectedPeakUsers ? `${wavePlan.expectedPeakUsers} expected peak users` : '-'}
- Test data notes: business \`${manifest.businessSlug || manifest.businessId || '-'}\`, team \`${manifest.teamId || '-'}\`

## Commands

\`\`\`bash
npm run qa:hockey-pilot-readiness
npm run qa:hockey-pilot-gates
npm run qa:launch-config
npm run qa:hockey
HOCKEY_PILOT_SUPPORT_OWNER="${support.owner || 'Support Lead'}" HOCKEY_PILOT_SUPPORT_SLA_HOURS=${support.slaHours || '24'} HOCKEY_PILOT_OPEN_CRITICAL_ISSUES=0 K6_SUMMARY_EXPORT=${relativeOrDash(artifacts.summaryJson, cwd)} npm run qa:hockey-pilot-gates -- --include-load
\`\`\`

## Artifacts

- Summary JSON: ${relativeOrDash(artifacts.summaryJson, cwd)}
- Analyzer output: ${relativeOrDash(artifacts.analyzerOutput, cwd)}
- Summary gate output: ${relativeOrDash(artifacts.gateOutput, cwd)}
- Manifest JSON: ${relativeOrDash(artifacts.manifestJson, cwd)}
- Evidence note: ${relativeOrDash(artifacts.evidenceMarkdown, cwd)}
- Screenshot or support notes: ${support.notesUrl || '-'}

## Manifest Snapshot

- Result status: ${result.status || '-'}
- Failed step: ${result.failedStep || '-'}
- k6 exit code: ${result.k6ExitCode ?? '-'}
- Summary gate: ${gateStatus}
- Gate modes: ${formatList(manifest.gateModes)}
- Git branch: ${git.branch || '-'}
- Git tree dirty: ${git.dirty === true ? 'yes' : git.dirty === false ? 'no' : '-'}
- Release evidence status: ${git.dirty === true ? 'dirty tree; rerun from a committed state before inviting' : git.dirty === false ? 'committed tree' : '-'}
- Business/team: ${manifest.businessSlug || manifest.businessId || '-'} / ${manifest.teamId || '-'}
- Client ID count: ${manifest.clientIdCount ?? '-'}
- Pilot users: ${wavePlan.estimatedUsers ?? '-'} (${wavePlan.teamCount ?? '-'} teams)
- Traffic weights: read ${weights.read || '-'}, athlete ${weights.athlete || '-'}, dashboard ${weights.dashboard || '-'}, export ${weights.export || '-'}
- Load profile: warm ${loadProfile.warmVus || '-'} VUs/${loadProfile.warmDuration || '-'}, steady ${loadProfile.steadyVus || '-'} VUs/${loadProfile.steadyDuration || '-'}, peak ${loadProfile.peakVus || '-'} VUs/${loadProfile.peakDuration || '-'}, ramp down ${loadProfile.rampDownDuration || '-'}
- Support owner: ${support.owner || '-'}
- Support SLA: ${support.slaHours ?? '-'}h
- Open critical support issues: ${support.openCriticalIssues ?? '-'}

## Gate Results

- Overall fail rate: ${formatRate(metricValue(summary, 'http_req_failed', 'value'))}
- Overall p95: ${formatMs(metricValue(summary, 'http_req_duration', 'p(95)'))}
- Overall p99: ${formatMs(metricValue(summary, 'http_req_duration', 'p(99)'))}
- Slowest endpoint: ${slowest ? `${slowest.endpoint} (${formatMs(slowest.p95)} p95)` : '-'}
- Endpoint failures: ${rows.some((row) => (row.failRate || 0) > 0) ? 'review endpoint table' : 'none'}

| Endpoint | p95 | p99 | Fail rate |
| --- | ---: | ---: | ---: |
${endpointTable}

## Access Checks

- Automated tenant-boundary regressions: ${manifest.gateModes?.includes('deterministic') ? 'run via `qa:hockey-pilot-gates`' : '-'}
- Staff invite/team assignment regressions: ${manifest.gateModes?.includes('deterministic') ? 'run via `qa:hockey-pilot-tenant-boundary`' : '-'}
- Live Team A vs Team B coach check: -
- Live athlete-to-athlete summary check: -
- Live team-scoped export check: -
- Live support/admin override check: -

## Manual Checks

- Coach can open assigned team dashboard: -
- Coach can review hockey tests: -
- Coach can export SIMCA/aerobic profile: -
- Athlete can open own dashboard: -
- Athlete can save daily metrics: -
- Team-scoped staff cannot access another team: -
- Athlete cannot access another athlete summary: -

## Support Watch

- Sign-in or invite reports: -
- Dashboard slow-load reports: -
- Hockey test review reports: -
- Export/SIMCA reports: -
- Daily metrics save reports: -
- Valid-user 401/403 reports: -
- Support SLA: ${support.slaHours ?? '-'}h
- Open critical support issues: ${support.openCriticalIssues ?? '-'}

## Issues

| Severity | Area | Symptom | Owner | Next action |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Decision Notes

${decisionFromManifest(manifest) === 'GO'
  ? 'Automated hockey pilot load gate passed. Complete manual checks before inviting the next wave.'
  : 'Automated hockey pilot gate did not fully pass. Fix the failed step and rerun before inviting more teams.'}
`
}

function main() {
  const manifestArg = process.argv[2]
  const outputArg = process.argv[3]
  if (!manifestArg) {
    usage()
    process.exit(1)
  }

  const cwd = process.cwd()
  const manifestPath = path.resolve(cwd, manifestArg)
  const manifest = readJson(manifestPath)
  const summaryPath = manifest.artifacts?.summaryJson
  if (!summaryPath) {
    throw new Error('Manifest is missing artifacts.summaryJson')
  }

  const summary = readJson(summaryPath)
  const gateText = readTextIfExists(manifest.artifacts?.gateOutput)
  const markdown = buildMarkdown({ manifest, summary, gateText, cwd })

  if (outputArg) {
    const outputPath = path.resolve(cwd, outputArg)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, markdown)
    console.log(`Saved hockey pilot evidence note: ${outputPath}`)
  } else {
    process.stdout.write(markdown)
  }
}

main()
