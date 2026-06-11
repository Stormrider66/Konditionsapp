'use client'

/**
 * ChatCardioWorkoutCard — result card for the createCardioWorkout chat tool.
 * Shows the assigned session and opens it on the cardio page (?start=<id>),
 * where the preview/focus-mode launcher takes over.
 */

import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Clock, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/i18n/client'

interface ChatCardioWorkoutCardProps {
  assignmentId: string
  name: string
  rounds: number
  stationCount: number
  totalDurationSeconds?: number | null
  basePath: string
}

export function ChatCardioWorkoutCard({
  assignmentId,
  name,
  rounds,
  stationCount,
  totalDurationSeconds,
  basePath,
}: ChatCardioWorkoutCardProps) {
  const locale = useLocale()
  const tw = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const router = useRouter()

  return (
    <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">{name}</p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {rounds > 1
                ? tw(`${rounds} rundor × ${stationCount} stationer`, `${rounds} rounds × ${stationCount} stations`)
                : tw(`${stationCount} stationer`, `${stationCount} stations`)}
            </span>
            {totalDurationSeconds != null && totalDurationSeconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />~{Math.round(totalDurationSeconds / 60)} min
              </span>
            )}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() => router.push(`${basePath}/athlete/cardio?start=${assignmentId}`)}
      >
        {tw('Öppna passet', 'Open workout')}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  )
}
