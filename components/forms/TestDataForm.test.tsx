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
})
