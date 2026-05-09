import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { artifactRows, buildMarkdown, decisionFromManifest, writeIndex } = require(path.join(testDir, 'hockey-pilot-evidence-index.cjs'))

function writeManifest(dir: string, name: string, manifest: Record<string, unknown>) {
  const manifestPath = path.join(dir, `${name}.manifest.json`)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  fs.writeFileSync(path.join(dir, `${name}.md`), '# Evidence note\n', 'utf8')
  return manifestPath
}

describe('hockey-pilot-evidence-index', () => {
  it('indexes manifest artifacts newest first', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hockey-evidence-'))
    writeManifest(dir, 'older', {
      createdAt: '2026-05-08T10:00:00.000Z',
      target: 'https://pilot-old.example.com',
      gateModes: ['load'],
      result: { status: 'passed' },
      git: { commitSha: 'oldsha', dirty: false },
      targetInfo: { productionLike: true },
      targetDeployment: { matchesManifestCommit: true },
      wavePlan: { teamCount: 2, expectedPeakUsers: 20 },
      support: { owner: 'Henrik', openCriticalIssues: '0', slaHours: '12' },
    })
    writeManifest(dir, 'newer', {
      createdAt: '2026-05-09T10:00:00.000Z',
      target: 'https://pilot-new.example.com',
      gateModes: ['load'],
      result: { status: 'failed' },
      git: { commitSha: 'newsha', dirty: false },
      targetInfo: { productionLike: true },
      targetDeployment: { matchesManifestCommit: true },
      wavePlan: { teamCount: 4, expectedPeakUsers: 40 },
      support: { owner: 'Anna', openCriticalIssues: '1', slaHours: '12' },
    })

    const rows = artifactRows(dir, dir)

    expect(rows.map((row: { commitSha: string }) => row.commitSha)).toEqual(['newsha', 'oldsha'])
    expect(rows[0]).toMatchObject({
      decision: 'FIX_AND_RERUN',
      status: 'failed',
      teams: 4,
      expectedPeakUsers: 40,
      supportOwner: 'Anna',
      openCriticalIssues: '1',
    })
    expect(rows[1]).toMatchObject({
      decision: 'GO',
      status: 'passed',
      teams: 2,
      expectedPeakUsers: 20,
      supportOwner: 'Henrik',
      openCriticalIssues: '0',
    })
  })

  it('marks unsafe manifests as fix and rerun', () => {
    expect(decisionFromManifest({
      result: { status: 'passed' },
      git: { dirty: false },
      gateModes: ['load'],
      targetInfo: { productionLike: false },
      targetDeployment: { matchesManifestCommit: true },
      support: { openCriticalIssues: '0', slaHours: '12' },
    })).toBe('FIX_AND_RERUN')
  })

  it('writes a markdown evidence index', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hockey-evidence-'))
    writeManifest(dir, 'run', {
      createdAt: '2026-05-09T10:00:00.000Z',
      target: 'https://pilot.example.com',
      gateModes: ['load'],
      result: { status: 'passed' },
      git: { commitSha: 'abc123', dirty: false },
      targetInfo: { productionLike: true },
      targetDeployment: { matchesManifestCommit: true },
      wavePlan: { teamCount: 3, expectedPeakUsers: 35 },
      support: { owner: 'Henrik', openCriticalIssues: '0', slaHours: '12' },
    })

    const result = writeIndex({
      evidenceDir: dir,
      outputPath: path.join(dir, 'INDEX.md'),
      cwd: dir,
      now: new Date('2026-05-09T12:00:00.000Z'),
    })

    expect(result.rows).toHaveLength(1)
    expect(result.markdown).toContain('| 2026-05-09T10:00:00.000Z | GO | passed | https://pilot.example.com | abc123 | load | 3 | 35 | Henrik | 0 | [manifest](run.manifest.json) | [note](run.md) |')
    expect(fs.readFileSync(path.join(dir, 'INDEX.md'), 'utf8')).toContain('Generated: 2026-05-09T12:00:00.000Z')
  })

  it('renders an empty index clearly', () => {
    expect(buildMarkdown([], new Date('2026-05-09T12:00:00.000Z'))).toContain('| - | - | - | - | - | - | - | - | - | - | - | - |')
  })
})
