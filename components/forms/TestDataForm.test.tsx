// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestDataForm } from './TestDataForm'

vi.mock('next-intl', () => ({
  useLocale: () => 'sv',
}))

vi.mock('@/components/forms/SmartTestImportDialog', () => ({
  SmartTestImportDialog: () => null,
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: () => undefined,
  }),
}))

describe('TestDataForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ success: true, data: [] }),
      }))
    )
  })

  it('updates decreasing lactate warnings when a stage value is corrected', async () => {
    const user = userEvent.setup()
    render(<TestDataForm testType="RUNNING" onSubmit={vi.fn()} />)

    const lactateInputs = screen.getAllByLabelText('Laktat (mmol/L)')
    const stage2Lactate = lactateInputs[1]
    const stage3Lactate = lactateInputs[2]

    await user.clear(stage3Lactate)
    await user.type(stage3Lactate, '9')
    await user.clear(stage2Lactate)
    await user.type(stage2Lactate, '15.3')

    expect(screen.getByText(/från steg 2 till steg 3/)).toBeInTheDocument()

    await user.clear(stage2Lactate)
    await user.type(stage2Lactate, '8.1')

    await waitFor(() => {
      expect(screen.queryByText(/från steg 2 till steg 3/)).not.toBeInTheDocument()
    })
  })

  it('deletes a saved test template from the load dialog', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'template-1',
              userId: 'user-1',
              name: 'Ske A-lag mall',
              testType: 'RUNNING',
              description: null,
              stages: [
                {
                  durationMinutes: 4,
                  durationSeconds: 0,
                  heartRate: 120,
                  lactate: 1,
                  speed: 8,
                },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TestDataForm testType="RUNNING" onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Ladda mall' }))
    expect(await screen.findByText('Ske A-lag mall')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Ta bort mallen Ske A-lag mall'))
    await user.click(screen.getByRole('button', { name: 'Ta bort' }))

    await waitFor(() => {
      expect(screen.queryByText('Ske A-lag mall')).not.toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/templates/template-1', { method: 'DELETE' })
  })
})
