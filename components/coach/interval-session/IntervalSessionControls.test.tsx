// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { IntervalSessionControls } from './IntervalSessionControls'

vi.mock('@/i18n/client', () => ({
  useLocale: () => 'sv',
}))

describe('IntervalSessionControls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:01:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('freezes the shared clock at the closed interval time', async () => {
    render(
      <IntervalSessionControls
        sessionId="session-1"
        status="ACTIVE"
        currentInterval={1}
        timerStartedAt="2026-06-14T12:00:00.000Z"
        protocol={{ intervalCount: 3 }}
        restMode="NONE"
        groupRestStartedAt={null}
        allTapped
        closedIntervalElapsedMs={33300}
        onStatusChange={vi.fn()}
        onAutoAdvance={vi.fn()}
      />
    )

    await act(async () => {})

    expect(screen.getByText('0:33.3')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText('0:33.3')).toBeInTheDocument()
  })
})
