/**
 * Smoke tests for the server-side program PDF route.
 *
 * These tests intentionally don't decode the PDF byte stream (that
 * would require pdf-parse or similar). They verify the contract:
 *   - requires coach auth
 *   - validates the body against ProgramSchema
 *   - returns application/pdf with a Content-Disposition filename when
 *     given a minimal valid program
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from '@/app/api/exports/program-pdf/route'

const minimalProgram = {
  name: 'Test Program',
  description: 'A compact program for smoke testing.',
  totalWeeks: 4,
  phases: [
    {
      name: 'Base',
      weeks: '1-4',
      focus: 'Aerob bas',
      weeklyTemplate: {
        monday: {
          type: 'RUNNING',
          name: 'Easy run',
          description: '30 min easy',
          intensity: 'easy',
          duration: 30,
        },
        tuesday: { type: 'REST' },
      },
    },
  ],
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/exports/program-pdf', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/exports/program-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the caller is not an authenticated coach', async () => {
    mockRequireCoach.mockRejectedValueOnce(new Error('Unauthorized'))

    const response = await POST(makeRequest({ program: minimalProgram }))

    expect(response.status).toBe(401)
  })

  it('returns 400 when the program body fails schema validation', async () => {
    mockRequireCoach.mockResolvedValueOnce({ id: 'coach-1' })

    const response = await POST(
      makeRequest({ program: { name: 'broken' /* missing fields */ } })
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns a streamed application/pdf for a valid program', async () => {
    mockRequireCoach.mockResolvedValueOnce({ id: 'coach-1' })

    const response = await POST(
      makeRequest({
        program: minimalProgram,
        athleteName: 'Jane Doe',
        coachName: 'John Coach',
        organization: 'Test Club',
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toMatch(
      /attachment; filename=".*\.pdf"/
    )

    // Drain the stream and verify we got *some* bytes back that start with the
    // PDF magic number %PDF-.
    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
    const header = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 5))
    expect(header).toBe('%PDF-')
  }, 30_000)
})
