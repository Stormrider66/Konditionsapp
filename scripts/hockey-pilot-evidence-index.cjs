#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function relativePath(filePath, cwd) {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/')
}

function decisionFromManifest(manifest) {
  if (manifest?.result?.status !== 'passed') return 'FIX_AND_RERUN'
  if (manifest?.git?.dirty === true) return 'FIX_AND_RERUN'
  if (Number.parseInt(manifest?.support?.openCriticalIssues || '0', 10) > 0) return 'FIX_AND_RERUN'
  if (Number.parseInt(manifest?.support?.slaHours || '24', 10) > 24) return 'FIX_AND_RERUN'
  if (manifest?.gateModes?.includes('load') && manifest?.targetInfo?.productionLike !== true) return 'FIX_AND_RERUN'
  if (manifest?.gateModes?.includes('load') && manifest?.targetDeployment?.matchesManifestCommit !== true) return 'FIX_AND_RERUN'
  return 'GO'
}

function evidenceMarkdownPath(manifestPath, manifest) {
  const explicit = manifest?.artifacts?.evidenceMarkdown
  if (explicit) return explicit
  return manifestPath.replace(/\.manifest\.json$/, '.md')
}

function artifactRows(evidenceDir = path.join(process.cwd(), 'load-tests', 'evidence'), cwd = process.cwd()) {
  if (!fs.existsSync(evidenceDir)) return []
  return fs.readdirSync(evidenceDir)
    .filter((fileName) => fileName.endsWith('.manifest.json'))
    .map((fileName) => {
      const manifestPath = path.join(evidenceDir, fileName)
      const manifest = readJson(manifestPath)
      const evidencePath = evidenceMarkdownPath(manifestPath, manifest)
      return {
        createdAt: manifest.createdAt || '-',
        target: manifest.target || '-',
        commitSha: manifest.git?.commitSha || '-',
        decision: decisionFromManifest(manifest),
        status: manifest.result?.status || '-',
        gateModes: Array.isArray(manifest.gateModes) ? manifest.gateModes.join(', ') : '-',
        teams: manifest.wavePlan?.teamCount ?? '-',
        expectedPeakUsers: manifest.wavePlan?.expectedPeakUsers ?? '-',
        supportOwner: manifest.support?.owner || '-',
        openCriticalIssues: manifest.support?.openCriticalIssues ?? '-',
        manifestPath: relativePath(manifestPath, cwd),
        evidencePath: fs.existsSync(evidencePath) ? relativePath(evidencePath, cwd) : '-',
      }
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

function buildMarkdown(rows, generatedAt = new Date()) {
  const tableRows = rows.length > 0
    ? rows.map((row) => `| ${row.createdAt} | ${row.decision} | ${row.status} | ${row.target} | ${row.commitSha} | ${row.gateModes} | ${row.teams} | ${row.expectedPeakUsers} | ${row.supportOwner} | ${row.openCriticalIssues} | [manifest](${row.manifestPath}) | ${row.evidencePath === '-' ? '-' : `[note](${row.evidencePath})`} |`).join('\n')
    : '| - | - | - | - | - | - | - | - | - | - | - | - |'

  return `# Hockey Pilot Evidence Index

Generated: ${generatedAt.toISOString()}

| Created | Decision | Status | Target | Commit | Gate modes | Teams | Peak users | Support owner | Critical issues | Manifest | Evidence note |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- |
${tableRows}
`
}

function writeIndex({
  evidenceDir = path.join(process.cwd(), 'load-tests', 'evidence'),
  outputPath = path.join(evidenceDir, 'INDEX.md'),
  cwd = process.cwd(),
  now = new Date(),
} = {}) {
  const rows = artifactRows(evidenceDir, cwd)
  const markdown = buildMarkdown(rows, now)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, markdown, 'utf8')
  return { rows, outputPath, markdown }
}

function main() {
  const outputPath = process.argv[2] || path.join(process.cwd(), 'load-tests', 'evidence', 'INDEX.md')
  const evidenceDir = process.argv[3] || path.dirname(outputPath)
  const result = writeIndex({ evidenceDir, outputPath })
  console.log(`Hockey pilot evidence index: ${path.relative(process.cwd(), result.outputPath)}`)
  console.log(`Runs indexed: ${result.rows.length}`)
}

if (require.main === module) {
  main()
}

module.exports = {
  artifactRows,
  buildMarkdown,
  decisionFromManifest,
  writeIndex,
}
