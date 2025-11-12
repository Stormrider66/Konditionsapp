// components/athlete/UpcomingWorkouts.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface UpcomingWorkoutsProps {
  workouts: any[]
}

export function UpcomingWorkouts({ workouts }: UpcomingWorkoutsProps) {
  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Kommande pass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Inga kommande pass planerade
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    const dateKey = format(workout.dayDate, 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(workout)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Kommande pass (7 dagar)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(workoutsByDate).map(([dateKey, dayWorkouts]) => (
          <div key={dateKey} className="space-y-2">
            <h4 className="font-semibold text-sm">
              {format(new Date(dateKey), 'EEEE d MMMM', { locale: sv })}
            </h4>
            <div className="space-y-2">
              {(dayWorkouts as any[]).map((workout) => (
                <div
                  key={workout.id}
                  className="border rounded-lg p-3 text-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{workout.name}</span>
                    <Badge
                      variant="outline"
                      className={getIntensityBadgeClass(workout.intensity)}
                    >
                      {formatIntensity(workout.intensity)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {workout.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {workout.duration} min
                      </span>
                    )}
                    {workout.distance && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {workout.distance} km
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}

function getIntensityBadgeClass(intensity: string): string {
  const classes: Record<string, string> = {
    RECOVERY: 'border-purple-300 text-purple-700',
    EASY: 'border-green-300 text-green-700',
    MODERATE: 'border-yellow-300 text-yellow-700',
    THRESHOLD: 'border-orange-300 text-orange-700',
    INTERVAL: 'border-red-300 text-red-700',
    MAX: 'border-red-500 text-red-800',
  }
  return classes[intensity] || ''
}
