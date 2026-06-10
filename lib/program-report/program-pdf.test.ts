import { describe, it, expect } from 'vitest'
import { generateProgramPdf } from '@/lib/program-report/program-pdf'

describe('generateProgramPdf', () => {
  it('renders a PDF buffer from a report', () => {
    const pdf = generateProgramPdf({
      programId: 'p1',
      name: 'Marathon Spring 2026',
      description: 'Build toward Stockholm Marathon with a polarized approach.',
      goal: { type: 'marathon', race: 'Stockholm Marathon', date: '2026-05-30T00:00:00.000Z' },
      methodology: 'POLARIZED',
      totalWeeks: 2,
      sessionsPerWeek: 4,
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-14T00:00:00.000Z',
      trainingZones: {
        zone1: { hrRange: '100-130 bpm', paceRange: '6:30-7:00 min/km' },
        zone2: { hrRange: '131-145 bpm' },
      },
      fieldTestSchedule: [{ testType: '30MIN_TT', week: 1, required: true }],
      raceSchedule: [{ name: 'Tune-up 10K', week: 2, distance: '10K', classification: 'B' }],
      weeks: [
        {
          weekNumber: 1,
          phase: 'BASE',
          focus: 'Aerobic volume',
          days: [
            {
              date: '2026-03-02T00:00:00.000Z',
              workouts: [
                { name: 'Easy Run', type: 'RUNNING', intensity: 'EASY', duration: 50, description: null },
                { name: 'Strength A', type: 'STRENGTH', intensity: 'MODERATE', duration: 40, description: null },
              ],
            },
          ],
        },
      ],
    })
    const bytes = new Uint8Array(pdf)
    expect(bytes.length).toBeGreaterThan(500)
    // %PDF header
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF')
  })
})
