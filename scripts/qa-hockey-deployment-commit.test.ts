import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { main } = require(path.join(testDir, 'qa-hockey-deployment-commit.cjs'))

describe('qa-hockey-deployment-commit', () => {
  it('prints the evidence commit and deployment inspection command', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    let output = ''
    try {
      main({
        GIT_COMMIT_SHA: 'abc123pilotsha',
        TRAINOMICS_QA_BASE_URL: 'https://pilot.example.com',
      })
      output = log.mock.calls.map((call) => call.join(' ')).join('\n')
    } finally {
      log.mockRestore()
    }

    expect(output).toContain('Current evidence commit: abc123pilotsha')
    expect(output).toContain('Deployment URL: https://pilot.example.com')
    expect(output).toContain('vercel inspect https://pilot.example.com')
    expect(output).toContain('HOCKEY_PILOT_TARGET_COMMIT_SHA="abc123pilotsha"')
  })
})
