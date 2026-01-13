'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const recommendations = useMemo((): TimingRecommendation[] => {
    if (!workoutSession) {
      // Rest day recommendations
      return [
        {
          timeWindow: '07:00 - 09:00',
          label: 'Frukost',
          description: 'Balanserad måltid med protein, kolhydrater och fett',
          priority: 'medium',
          macroFocus: '20-30g protein, fullkorn, hälsosamma fetter',
          icon: Utensils,
        },
        {
          timeWindow: '12:00 - 13:00',
          label: 'Lunch',
          description: 'Huvudmåltid med fokus på protein och grönsaker',
          priority: 'medium',
          macroFocus: '30-40g protein, rikligt med grönsaker',
          icon: Utensils,
        },
        {
          timeWindow: '18:00 - 19:00',
          label: 'Middag',
          description: 'Måttlig måltid, undvik tunga måltider sent',
          priority: 'medium',
          macroFocus: '25-35g protein, begränsa kolhydrater vid viktnedgång',
          icon: Utensils,
        },
      ]
    }

    const workoutHour = parseInt(workoutSession.time.split(':')[0])
    const recs: TimingRecommendation[] = []

    // Pre-workout meal (2-3 hours before)
    recs.push({
      timeWindow: formatTimeWindow(workoutHour, -3, 1),
      label: 'Sista större måltid',
      description: 'Ät din sista större måltid 2-3 timmar före träning för optimal energi',
      priority: 'high',
      macroFocus: '40-60g kolhydrater, 20-30g protein, låg fett',
      icon: Utensils,
    })

    // Pre-workout snack (30-60 min before)
    if (workoutSession.intensity !== 'low') {
      recs.push({
        timeWindow: formatTimeWindow(workoutHour, -1, 0.5),
        label: 'Pre-workout snack',
        description: 'Lätt snack för extra energi om behov finns',
        priority: 'medium',
        macroFocus: '20-30g snabba kolhydrater (frukt, riskakor)',
        icon: Timer,
      })
    }

    // Workout window
    recs.push({
      timeWindow: workoutSession.time,
      label: workoutSession.type,
      description: `${workoutSession.duration} min ${workoutSession.intensity === 'high' ? 'intensiv' : workoutSession.intensity === 'moderate' ? 'måttlig' : 'lätt'} träning`,
      priority: 'high',
      icon: Dumbbell,
    })

    // Post-workout (within 30-60 min)
    recs.push({
      timeWindow: formatTimeWindow(workoutHour, Math.ceil(workoutSession.duration / 60), 1),
      label: 'Post-workout',
      description: 'Optimal tid för återhämtning - ät inom 30-60 minuter',
      priority: 'high',
      macroFocus: '20-40g protein, 50-100g kolhydrater',
      icon: CheckCircle2,
    })

    // Evening meal if workout is in afternoon
    if (workoutHour < 18) {
      const dinnerHour = Math.max(workoutHour + 3, 18)
      recs.push({
        timeWindow: formatTimeWindow(dinnerHour, 0, 1),
        label: 'Middag',
        description: 'Komplett måltid för fortsatt återhämtning',
        priority: 'medium',
        macroFocus: '30-40g protein, grönsaker, måttliga kolhydrater',
        icon: Utensils,
      })
    }

    return recs.sort((a, b) => {
      const getHour = (tw: string) => parseInt(tw.split(':')[0])
      return getHour(a.timeWindow) - getHour(b.timeWindow)
    })
  }, [workoutSession])

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
          Måltidstiming
        </CardTitle>
        <CardDescription>
          {workoutSession
            ? `Optimerad för ${workoutSession.type.toLowerCase()} kl ${workoutSession.time}`
            : 'Vilodag - fokus på återhämtning'}
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
              Viktiga tips
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {workoutSession ? (
                <>
                  <li>• Undvik fettrik mat 1-2 timmar före träning</li>
                  <li>• Drick 500ml vatten 2 timmar före träning</li>
                  <li>• Protein efter träning hjälper muskelåterhämtning</li>
                  {workoutSession.intensity === 'high' && (
                    <li>• Vid intensiv träning - extra fokus på kolhydrater före och efter</li>
                  )}
                </>
              ) : (
                <>
                  <li>• Vilodagar är viktiga för återhämtning</li>
                  <li>• Behåll proteinintaget för muskelunderhåll</li>
                  <li>• Kan minska kolhydrater något på vilodagar</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
