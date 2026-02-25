'use client'

import { useRouter } from 'next/navigation'
import { Dumbbell, Clock, Flame, ArrowRight, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatWorkoutCardProps {
  wodId: string
  title: string
  subtitle?: string | null
  duration: number
  workoutType: string
  intensity?: string | null
  exerciseCount: number
  sectionCount: number
  basePath: string
}

const typeLabels: Record<string, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  mixed: 'Blandat',
  core: 'Core',
}

const intensityLabels: Record<string, string> = {
  recovery: 'Återhämtning',
  easy: 'Lätt',
  moderate: 'Måttlig',
  threshold: 'Tröskel',
}

export function ChatWorkoutCard({
  wodId,
  title,
  duration,
  workoutType,
  intensity,
  exerciseCount,
  basePath,
}: ChatWorkoutCardProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-3 my-2">
      <div className="flex items-start gap-2 mb-2">
        <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-1.5 shrink-0">
          <Dumbbell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 truncate">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {duration} min
            </span>
            <span className="text-emerald-300 dark:text-emerald-600">|</span>
            <span>{typeLabels[workoutType] || workoutType}</span>
            {intensity && (
              <>
                <span className="text-emerald-300 dark:text-emerald-600">|</span>
                <span className="inline-flex items-center gap-0.5">
                  <Flame className="h-3 w-3" /> {intensityLabels[intensity] || intensity}
                </span>
              </>
            )}
            <span className="text-emerald-300 dark:text-emerald-600">|</span>
            <span>{exerciseCount} övningar</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          onClick={() => router.push(`${basePath}/athlete/wod/${wodId}`)}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          Öppna passet
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          onClick={() => {
            router.push(`${basePath}/athlete/dashboard`)
            router.refresh()
          }}
        >
          <LayoutDashboard className="h-3 w-3 mr-1" />
          Dashboard
        </Button>
      </div>
    </div>
  )
}
