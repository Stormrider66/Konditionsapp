'use client'

interface IntervalSummaryBarProps {
  currentInterval: number
  totalParticipants: number
  tappedThisInterval: number
  avgSplitMs: number | null
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

export function IntervalSummaryBar({
  currentInterval,
  totalParticipants,
  tappedThisInterval,
  avgSplitMs,
}: IntervalSummaryBarProps) {
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2 text-sm">
      <div>
        <span className="font-medium">Intervall {currentInterval}</span>
      </div>
      <div className="flex gap-6">
        <div>
          <span className="text-muted-foreground">Tappade: </span>
          <span className="font-medium">
            {tappedThisInterval} / {totalParticipants}
          </span>
        </div>
        {avgSplitMs !== null && (
          <div>
            <span className="text-muted-foreground">Snitt: </span>
            <span className="font-mono font-medium">{formatSplit(avgSplitMs)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
