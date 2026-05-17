'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/i18n/client'
import {
  Clock,
  Dumbbell,
  Utensils,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkoutSession {
  time: string // "17:00"
  type: string // "Styrka", "Löpning", etc.
  intensity: 'low' | 'moderate' | 'high'
  duration: number // minutes
}

interface MealTimingGuideProps {
  workoutSession?: WorkoutSession
  className?: string
}

interface TimingRecommendation {
  timeWindow: string
  label: string
  description: string
  priority: 'high' | 'medium' | 'low'
  macroFocus?: string
  icon: typeof Clock
}

function formatTimeWindow(baseHour: number, offsetHours: number, duration: number = 0): string {
  const startHour = baseHour + offsetHours
  const endHour = startHour + (duration > 0 ? Math.ceil(duration / 60) : 1)

  const formatHour = (h: number) => {
    const hour = h < 0 ? h + 24 : h > 23 ? h - 24 : h
    return `${hour.toString().padStart(2, '0')}:00`
  }

  return `${formatHour(startHour)} - ${formatHour(endHour)}`
}

export function MealTimingGuide({ workoutSession, className }: MealTimingGuideProps) {
  const t = useTranslations('components.mealTimingGuide')

  const recommendations = useMemo((): TimingRecommendation[] => {
    if (!workoutSession) {
      // Rest day recommendations
      return [
        {
          timeWindow: '07:00 - 09:00',
          label: t('recommendations.rest.breakfast.label'),
          description: t('recommendations.rest.breakfast.description'),
          priority: 'medium',
          macroFocus: t('recommendations.rest.breakfast.macroFocus'),
          icon: Utensils,
        },
        {
          timeWindow: '12:00 - 13:00',
          label: t('recommendations.rest.lunch.label'),
          description: t('recommendations.rest.lunch.description'),
          priority: 'medium',
          macroFocus: t('recommendations.rest.lunch.macroFocus'),
          icon: Utensils,
        },
        {
          timeWindow: '18:00 - 19:00',
          label: t('recommendations.rest.dinner.label'),
          description: t('recommendations.rest.dinner.description'),
          priority: 'medium',
          macroFocus: t('recommendations.rest.dinner.macroFocus'),
          icon: Utensils,
        },
      ]
    }

    const workoutHour = parseInt(workoutSession.time.split(':')[0])
    const recs: TimingRecommendation[] = []

    // Pre-workout meal (2-3 hours before)
    recs.push({
      timeWindow: formatTimeWindow(workoutHour, -3, 1),
      label: t('recommendations.workout.preMeal.label'),
      description: t('recommendations.workout.preMeal.description'),
      priority: 'high',
      macroFocus: t('recommendations.workout.preMeal.macroFocus'),
      icon: Utensils,
    })

    // Pre-workout snack (30-60 min before)
    if (workoutSession.intensity !== 'low') {
      recs.push({
        timeWindow: formatTimeWindow(workoutHour, -1, 0.5),
        label: t('recommendations.workout.preSnack.label'),
        description: t('recommendations.workout.preSnack.description'),
        priority: 'medium',
        macroFocus: t('recommendations.workout.preSnack.macroFocus'),
        icon: Timer,
      })
    }

    const intensityKey =
      workoutSession.intensity === 'high'
        ? 'high'
        : workoutSession.intensity === 'moderate'
          ? 'moderate'
          : 'low'

    // Workout window
    recs.push({
      timeWindow: workoutSession.time,
      label: workoutSession.type,
      description: t('recommendations.workout.session.description', {
        duration: workoutSession.duration,
        intensity: t(`intensity.${intensityKey}`),
      }),
      priority: 'high',
      icon: Dumbbell,
    })

    // Post-workout (within 30-60 min)
    recs.push({
      timeWindow: formatTimeWindow(workoutHour, Math.ceil(workoutSession.duration / 60), 1),
      label: t('recommendations.workout.postWorkout.label'),
      description: t('recommendations.workout.postWorkout.description'),
      priority: 'high',
      macroFocus: t('recommendations.workout.postWorkout.macroFocus'),
      icon: CheckCircle2,
    })

    // Evening meal if workout is in afternoon
    if (workoutHour < 18) {
      const dinnerHour = Math.max(workoutHour + 3, 18)
      recs.push({
        timeWindow: formatTimeWindow(dinnerHour, 0, 1),
        label: t('recommendations.workout.dinner.label'),
        description: t('recommendations.workout.dinner.description'),
        priority: 'medium',
        macroFocus: t('recommendations.workout.dinner.macroFocus'),
        icon: Utensils,
      })
    }

    return recs.sort((a, b) => {
      const getHour = (tw: string) => parseInt(tw.split(':')[0])
      return getHour(a.timeWindow) - getHour(b.timeWindow)
    })
  }, [t, workoutSession])

  const getPriorityColor = (priority: TimingRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {workoutSession
            ? t('description.workout', {
                type: workoutSession.type.toLowerCase(),
                time: workoutSession.time,
              })
            : t('description.rest')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {recommendations.map((rec, index) => {
              const Icon = rec.icon
              const isLast = index === recommendations.length - 1

              return (
                <div key={rec.label + rec.timeWindow} className="flex gap-4 pb-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getPriorityColor(rec.priority)
                    )} />
                    {!isLast && (
                      <div className="w-0.5 h-full bg-border mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {rec.timeWindow}
                      </Badge>
                      <span className="font-medium text-sm">{rec.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {rec.description}
                    </p>
                    {rec.macroFocus && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{rec.macroFocus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tips */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              {t('tips.title')}
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {workoutSession ? (
                <>
                  <li>{t('tips.workout.lowFat')}</li>
                  <li>{t('tips.workout.water')}</li>
                  <li>{t('tips.workout.protein')}</li>
                  {workoutSession.intensity === 'high' && (
                    <li>{t('tips.workout.highIntensity')}</li>
                  )}
                </>
              ) : (
                <>
                  <li>{t('tips.rest.recovery')}</li>
                  <li>{t('tips.rest.protein')}</li>
                  <li>{t('tips.rest.carbs')}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
