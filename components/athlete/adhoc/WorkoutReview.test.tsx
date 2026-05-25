// @vitest-environment jsdom

import React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/sv.json'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { WorkoutReview } from './WorkoutReview'

function renderReview(
  parsedWorkout: ParsedWorkout,
  onConfirm = vi.fn().mockResolvedValue(undefined)
) {
  render(
    <NextIntlClientProvider locale="sv" messages={messages}>
      <WorkoutReview
        parsedWorkout={parsedWorkout}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        isSubmitting={false}
      />
    </NextIntlClientProvider>
  )

  return { onConfirm }
}

const baseWorkout = {
  type: 'HYBRID',
  confidence: 0.95,
  name: 'Cirkelpass 35/25',
  duration: 36,
  intensity: 'INTERVAL',
  perceivedEffort: 7,
  notes: 'Cirkelträningspass med 6 övningar.',
  rawInterpretation: 'Tolkade ett cirkelpass från bilden.',
} satisfies ParsedWorkout

describe('WorkoutReview', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  it('omits null AI feeling values when confirming without a selected feeling', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderReview({
      ...baseWorkout,
      feeling: null,
    } as unknown as ParsedWorkout)

    await user.click(screen.getByRole('button', { name: /bekräfta/i }))

    expect(onConfirm).toHaveBeenCalledWith({
      perceivedEffort: 7,
      notes: 'Cirkelträningspass med 6 övningar.',
    })
  })

  it('includes a feeling after the athlete selects one', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderReview(baseWorkout)

    await user.click(screen.getByRole('button', { name: /bra/i }))
    await user.click(screen.getByRole('button', { name: /bekräfta/i }))

    expect(onConfirm).toHaveBeenCalledWith({
      perceivedEffort: 7,
      feeling: 'GOOD',
      notes: 'Cirkelträningspass med 6 övningar.',
    })
  })
})
