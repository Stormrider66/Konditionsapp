// components/athlete/TodaysWorkouts.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface TodaysWorkoutsProps {
  workouts: any[]
}

export function TodaysWorkouts({ workouts }: TodaysWorkoutsProps) {
  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dagens pass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Vilodag idag! 🎉</p>
            <p className="text-sm text-muted-foreground mt-2">
              Använd tiden för återhämtning och förberedelser
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Dagens pass ({workouts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </CardContent>
    </Card>
  )
}

function WorkoutCard({ workout }: { workout: any }) {
  const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed
  const log = workout.logs?.[0]

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{workout.name}</h4>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Klar
              </Badge>
            )}
            <Badge variant="outline" className={getIntensityBadgeClass(workout.intensity)}>
              {formatIntensity(workout.intensity)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{workout.programName}</p>
        </div>
      </div>

      {workout.instructions && (
        <p className="text-sm text-muted-foreground">{workout.instructions}</p>
      )}

      {/* Workout segments preview */}
      {workout.segments && workout.segments.length > 0 && (
        <div className="space-y-1">
          {workout.segments.map((segment: any) => (
            <div key={segment.id} className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-xs">
                {formatSegmentType(segment.type)}
              </Badge>
              <span className="text-muted-foreground">
                {segment.description}
                {segment.duration && ` (${segment.duration} min)`}
                {segment.pace && ` @ ${segment.pace}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {workout.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {workout.duration} min
          </span>
        )}
        {workout.distance && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {workout.distance} km
          </span>
        )}
      </div>

      {isCompleted ? (
        <div className="flex gap-2">
          <Link href={`/athlete/workouts/${workout.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Visa logg
            </Button>
          </Link>
          <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Redigera
            </Button>
          </Link>
        </div>
      ) : (
        <Link href={`/athlete/workouts/${workout.id}/log`}>
          <Button className="w-full">Logga pass</Button>
        </Link>
      )}
    </div>
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

function formatSegmentType(type: string): string {
  const types: Record<string, string> = {
    warmup: 'Uppvärmning',
    interval: 'Intervall',
    cooldown: 'Nedvärmning',
    work: 'Arbete',
    rest: 'Vila',
    exercise: 'Övning',
  }
  return types[type] || type
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
