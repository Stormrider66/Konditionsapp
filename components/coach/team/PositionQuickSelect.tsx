'use client'

import { Button } from '@/components/ui/button'

interface PositionQuickSelectProps {
  /** Distinct positions present in the squad. */
  positions: string[]
  allLabel: string
  /** Select all members (clears exclusions). */
  onSelectAll: () => void
  /** Select only members of this position. */
  onSelectPosition: (position: string) => void
}

/**
 * Position quick-select chips for the assignment dialog. "All" clears
 * exclusions; a position chip narrows the selection to that position. Renders
 * nothing when the squad has no positions set (so it stays out of the way until
 * the roster is populated).
 */
export function PositionQuickSelect({
  positions,
  allLabel,
  onSelectAll,
  onSelectPosition,
}: PositionQuickSelectProps) {
  if (positions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
        {allLabel}
      </Button>
      {positions.map((position) => (
        <Button
          key={position}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectPosition(position)}
        >
          {position}
        </Button>
      ))}
    </div>
  )
}
