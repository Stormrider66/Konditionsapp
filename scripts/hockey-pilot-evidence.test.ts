import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, '..')
const scriptPath = path.resolve(testDir, 'hockey-pilot-evidence.cjs')
const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'hockey-evidence-'))
  tempDirs.push(dir)
  return dir
}

function writePilotArtifacts(dir: string, status: 'passed' | 'failed' = 'passed') {
  const summaryPath = path.join(dir, 'summary.json')
  const gatePath = path.join(dir, 'summary.gate.txt')
  const analyzerPath = path.join(dir, 'summary.analyzer.txt')
  const manifestPath = path.join(dir, 'summary.manifest.json')

  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        metrics: {
          http_req_failed: { value: 0 },
          http_req_duration: { 'p(95)': 1740.5, 'p(99)': 2542.7 },
          'endpoint_duration{endpoint:team-dashboard}': { 'p(95)': 1393.4, 'p(99)': 1671.1 },
          'endpoint_failed{endpoint:team-dashboard}': { value: 0 },
          'endpoint_duration{endpoint:hockey-simca-export}': { 'p(95)': 2751.8, 'p(99)': 2785.5 },
          'endpoint_failed{endpoint:hockey-simca-export}': { value: 0 },
        },
      },
      null,
      2
    )
  )
  writeFileSync(gatePath, status === 'passed' ? 'Hockey pilot summary gate passed.\n' : 'Hockey pilot summary gate failed (1 failure).\n')
  writeFileSync(analyzerPath, 'Overall\nHTTP req p95 1741ms\n')
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        createdAt: '2026-05-08T20:51:48.668Z',
        script: 'hockey-pilot',
        result: {
          status,
          failedStep: status === 'passed' ? null : 'hockey pilot summary gate',
          exitCode: status === 'passed' ? 0 : 1,
          k6ExitCode: status === 'passed' ? 0 : 99,
        },
        gateModes: ['deterministic', 'browser', 'load'],
        git: {
          commitSha: 'abc123pilotsha',
          branch: 'main',
          dirty: false,
        },
        target: 'https://pilot.example.com',
        businessSlug: 'skelleftea-aik',
        teamId: 'team-1',
        clientIdCount: 12,
        wavePlan: {
          teamCount: 4,
          athletesPerTeam: 25,
          staffPerTeam: 3,
          expectedPeakUsers: 45,
          estimatedAthletes: 100,
          estimatedStaff: 12,
          estimatedUsers: 112,
          waves: [
            'Internal dry run',
            'Team 1',
            'Teams 2-3 after 48 quiet hours',
            'Team 4 after rerunning the load gate',
          ],
        },
        weights: {
          read: '0.40',
          athlete: '0.25',
          dashboard: '0.20',
          export: '0.15',
        },
        artifacts: {
          summaryJson: summaryPath,
          analyzerOutput: analyzerPath,
          gateOutput: gatePath,
          manifestJson: manifestPath,
          evidenceMarkdown: path.join(dir, 'summary.md'),
        },
      },
      null,
      2
    )
  )

  return { manifestPath }
}

describe('hockey-pilot-evidence', () => {
  it('prints a filled GO evidence note from a passed manifest', () => {
    const dir = tempDir()
    const { manifestPath } = writePilotArtifacts(dir)
    const result = spawnSync(process.execPath, [scriptPath, manifestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Decision: `GO`')
    expect(result.stdout).toContain('Commit SHA: abc123pilotsha')
    expect(result.stdout).toContain('Evidence note:')
    expect(result.stdout).toContain('Git branch: main')
    expect(result.stdout).toContain('Gate modes: deterministic, browser, load')
    expect(result.stdout).toContain('Teams invited: 4')
    expect(result.stdout).toContain('Expected athletes: 100')
    expect(result.stdout).toContain('Expected coach/staff users: 12')
    expect(result.stdout).toContain('Busy window tested: 45 expected peak users')
    expect(result.stdout).toContain('Pilot users: 112 (4 teams)')
    expect(result.stdout).toContain('Git tree dirty: no')
    expect(result.stdout).toContain('Overall p95: 1741ms')
    expect(result.stdout).toContain('Slowest endpoint: hockey-simca-export (2752ms p95)')
    expect(result.stdout).toContain('| team-dashboard | 1393ms | 1671ms | 0.00% |')
    expect(result.stdout).toContain('Traffic weights: read 0.40, athlete 0.25, dashboard 0.20, export 0.15')
  })

  it('writes the evidence note when an output path is provided', () => {
    const dir = tempDir()
    const { manifestPath } = writePilotArtifacts(dir, 'failed')
    const outputPath = path.join(dir, 'evidence.md')
    const result = spawnSync(process.execPath, [scriptPath, manifestPath, outputPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(existsSync(outputPath)).toBe(true)
    const markdown = readFileSync(outputPath, 'utf8')
    expect(markdown).toContain('Decision: `FIX_AND_RERUN`')
    expect(markdown).toContain('Failed step: hockey pilot summary gate')
    expect(result.stdout).toContain('Saved hockey pilot evidence note:')
  })
})
