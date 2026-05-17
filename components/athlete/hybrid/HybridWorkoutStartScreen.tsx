'use client'

/**
 * HybridWorkoutStartScreen Component
 *
 * Pre-workout screen showing workout overview before starting Focus Mode.
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock,
  Target,
  Dumbbell,
  Play,
  X,
  Repeat,
  Timer,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

type HybridFormat =
  | 'FOR_TIME'
  | 'AMRAP'
  | 'EMOM'
  | 'TABATA'
  | 'CHIPPER'
  | 'LADDER'
  | 'INTERVALS'
  | 'HYROX_SIM'

interface Movement {
  id: string
  name: string
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weight?: number
}

interface HybridWorkoutStartScreenProps {
  workoutName: string
  description?: string
  format: HybridFormat
  timeCap?: number
  totalRounds?: number
  repScheme?: string
  movements: Movement[]
  scalingLevel: string
  scalingNotes?: string
  isBenchmark: boolean
  benchmarkSource?: string
  warmupData?: unknown
  cooldownData?: unknown
  onStart: () => void
  onCancel: () => void
}

const FORMAT_INFO: Record<
  HybridFormat,
  { labelKey: TranslationKey; descriptionKey: TranslationKey; badge: string; icon: React.ReactNode }
> = {
  FOR_TIME: {
    labelKey: 'formats.forTime.label',
    descriptionKey: 'formats.forTime.description',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Timer className="h-4 w-4" />,
  },
  AMRAP: {
    labelKey: 'formats.amrap.label',
    descriptionKey: 'formats.amrap.description',
    badge: 'bg-red-100 text-red-700',
    icon: <Repeat className="h-4 w-4" />,
  },
  EMOM: {
    labelKey: 'formats.emom.label',
    descriptionKey: 'formats.emom.description',
    badge: 'bg-green-100 text-green-700',
    icon: <Clock className="h-4 w-4" />,
  },
  TABATA: {
    labelKey: 'formats.tabata.label',
    descriptionKey: 'formats.tabata.description',
    badge: 'bg-orange-100 text-orange-700',
    icon: <Flame className="h-4 w-4" />,
  },
  CHIPPER: {
    labelKey: 'formats.chipper.label',
    descriptionKey: 'formats.chipper.description',
    badge: 'bg-purple-100 text-purple-700',
    icon: <Target className="h-4 w-4" />,
  },
  LADDER: {
    labelKey: 'formats.ladder.label',
    descriptionKey: 'formats.ladder.description',
    badge: 'bg-indigo-100 text-indigo-700',
    icon: <Target className="h-4 w-4" />,
  },
  INTERVALS: {
    labelKey: 'formats.intervals.label',
    descriptionKey: 'formats.intervals.description',
    badge: 'bg-teal-100 text-teal-700',
    icon: <Timer className="h-4 w-4" />,
  },
  HYROX_SIM: {
    labelKey: 'formats.hyroxSim.label',
    descriptionKey: 'formats.hyroxSim.description',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: <Flame className="h-4 w-4" />,
  },
}

type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0]

const SCALING_BADGES: Record<string, string> = {
  RX: 'bg-green-100 text-green-700',
  SCALED: 'bg-blue-100 text-blue-700',
  CUSTOM: 'bg-purple-100 text-purple-700',
  FOUNDATIONS: 'bg-gray-100 text-gray-700',
}

export function HybridWorkoutStartScreen({
  workoutName,
  description,
  format,
  timeCap,
  totalRounds,
  repScheme,
  movements,
  scalingLevel,
  scalingNotes,
  isBenchmark,
  benchmarkSource,
  warmupData,
  cooldownData,
  onStart,
  onCancel,
}: HybridWorkoutStartScreenProps) {
  const t = useTranslations('components.hybridWorkoutStartScreen')
  const formatInfo = FORMAT_INFO[format]

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}min`
    }
    return `${mins} min`
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">{t('title')}</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Workout info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge className={cn(formatInfo.badge)}>
              {formatInfo.icon}
              <span className="ml-1">{t(formatInfo.labelKey)}</span>
            </Badge>
            <Badge className={cn(SCALING_BADGES[scalingLevel])}>
              {scalingLevel}
            </Badge>
            {isBenchmark && benchmarkSource && (
              <Badge variant="outline">{benchmarkSource}</Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold">{workoutName}</h2>
          <p className="text-sm text-muted-foreground">{t(formatInfo.descriptionKey)}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {timeCap && (
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{formatTime(timeCap)}</p>
                <p className="text-xs text-muted-foreground">{t('stats.timeCap')}</p>
              </CardContent>
            </Card>
          )}
          {totalRounds && (
            <Card>
              <CardContent className="p-4 text-center">
                <Repeat className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{totalRounds}</p>
                <p className="text-xs text-muted-foreground">{t('stats.rounds')}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 text-center">
              <Dumbbell className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{movements.length}</p>
              <p className="text-xs text-muted-foreground">{t('stats.exercises')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Rep scheme */}
        {!!repScheme && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                {t('repScheme')}
              </p>
              <p className="text-2xl font-bold">{repScheme}</p>
            </CardContent>
          </Card>
        )}

        {/* Movements list */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('exercisesTitle')}
            </h3>
            <div className="space-y-3">
              {movements.map((movement, index) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{movement.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {movement.reps && (
                      <Badge variant="outline">{movement.reps} reps</Badge>
                    )}
                    {movement.calories && (
                      <Badge variant="outline">{movement.calories} cal</Badge>
                    )}
                    {movement.distance && (
                      <Badge variant="outline">{movement.distance}m</Badge>
                    )}
                    {movement.duration && (
                      <Badge variant="outline">{movement.duration}s</Badge>
                    )}
                    {movement.weight && (
                      <Badge variant="secondary">{movement.weight}kg</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scaling notes */}
        {scalingNotes && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 text-sm">{t('scalingNotes')}</h3>
              <p className="text-sm text-muted-foreground">{scalingNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Warmup/Cooldown indicators */}
        {!!(warmupData || cooldownData) && (
          <div className="flex gap-2">
            {!!warmupData && (
              <Badge variant="outline" className="text-xs">
                {t('included.warmup')}
              </Badge>
            )}
            {!!cooldownData && (
              <Badge variant="outline" className="text-xs">
                {t('included.cooldown')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Footer with start button */}
      <div className="p-4 border-t bg-background">
        <Button size="lg" className="w-full h-14 text-lg" onClick={onStart}>
          <Play className="h-5 w-5 mr-2" />
          {t('actions.startWorkout')}
        </Button>
      </div>
    </div>
  )
}

export default HybridWorkoutStartScreen
