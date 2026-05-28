// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamWorkoutMonitor } from './TeamWorkoutMonitor'

vi.mock('next-intl', () => ({
  useLocale: () => 'sv',
}))

const summaryPayload = {
  success: true,
  data: {
    team: { id: 'team-1', name: 'Piteå Hockey A-lag', memberCount: 2 },
    days: 30,
    totals: { assigned: 2, completed: 1, missed: 1, missing: 0, pending: 0, completionRate: 50 },
    sessions: [
      {
        id: 'broadcast-1',
        detailKind: 'broadcast',
        workoutKind: 'strength',
        workoutName: 'Power/Plyometri 1',
        assignedDate: '2026-05-25T00:00:00.000Z',
        assigned: 2,
        completed: 1,
        missed: 1,
        pending: 0,
        missing: 0,
        completionRate: 50,
        avgRpe: 8,
        avgDurationSeconds: 3600,
        notes: null,
      },
    ],
    players: [
      {
        athleteId: 'athlete-1',
        name: 'Lars Bryggman',
        jerseyNumber: 18,
        position: 'Forward',
        assigned: 1,
        completed: 1,
        missed: 0,
        pending: 0,
        avgRpe: 8,
        completionRate: 100,
      },
    ],
    detail: null,
  },
}

const detailPayload = {
  success: true,
  data: {
    ...summaryPayload.data,
    detail: {
      id: 'broadcast-1',
      kind: 'broadcast',
      workoutKind: 'strength',
      workoutName: 'Power/Plyometri 1',
      assignedDate: '2026-05-25T00:00:00.000Z',
      overview: {
        assigned: 2,
        completed: 1,
        missing: 0,
        completionRate: 50,
        avgRpe: 8,
        avgDurationSeconds: 3600,
        notes: null,
      },
      athletes: [
        {
          assignmentId: 'assignment-1',
          athleteId: 'athlete-1',
          athleteName: 'Lars Bryggman',
          jerseyNumber: 18,
          position: 'Forward',
          kind: 'strength',
          status: 'COMPLETED',
          completedAt: '2026-05-25T16:00:00.000Z',
          isCompleted: true,
          rpe: 8,
          durationSeconds: 3600,
          notes: null,
        },
      ],
      exerciseRows: [
        {
          athleteId: 'athlete-1',
          athleteName: 'Lars Bryggman',
          exerciseName: 'Trap bar deadlift',
          setNumber: 1,
          loadKg: 120,
          reps: 5,
          rpe: 8,
          meanVelocity: 0.62,
          peakVelocity: 0.8,
          meanPower: 520,
          peakPower: 740,
          meanTime: 0.8,
          peakTime: 0.7,
          estimated1RM: 140,
          note: null,
        },
      ],
      intervalRows: [],
    },
  },
}

describe('TeamWorkoutMonitor', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        return {
          ok: true,
          json: async () => url.includes('detailKind=broadcast') ? detailPayload : summaryPayload,
        }
      })
    )
  })

  it('shows session and player views, then opens strength details', async () => {
    const user = userEvent.setup()
    render(<TeamWorkoutMonitor teamId="team-1" businessSlug="star-by-thomson" />)

    expect(await screen.findByText('Genomförandegrad')).toBeInTheDocument()
    expect(await screen.findByText(/1 pass dolda/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Visa pass/ })[0])
    expect(await screen.findByText('Power/Plyometri 1')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Spelare' }))
    expect(screen.getByText(/Lars Bryggman/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Pass' }))
    await user.click(screen.getByText('Power/Plyometri 1'))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('tab', { name: 'Övningar' }))
    expect(await within(sheet).findByText('Styrkeloggar')).toBeInTheDocument()
    expect(within(sheet).getByText('Trap bar deadlift')).toBeInTheDocument()
    expect(within(sheet).getByText(/120 kg/)).toBeInTheDocument()
    expect(within(sheet).getByText(/0.62 m\/s/)).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('detailKind=broadcast'))
    })
  })
})
