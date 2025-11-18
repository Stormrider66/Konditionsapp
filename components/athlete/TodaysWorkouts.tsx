// components/athlete/TodaysWorkouts.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { formatPace } from '@/lib/utils'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'

interface TodaysWorkoutsProps {
  workouts: DashboardWorkoutWithContext[]
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

function WorkoutCard({ workout }: { workout: DashboardWorkoutWithContext }) {
  const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed

  return (
    <div className="border rounded-lg p-3 sm:p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm sm:text-base truncate">{workout.name}</h4>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500 flex-shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                <span className="text-xs">Klar</span>
              </Badge>
            )}
            <Badge variant="outline" className={`${getIntensityBadgeClass(workout.intensity)} flex-shrink-0 text-xs`}>
              {formatIntensity(workout.intensity)}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{workout.programName}</p>
        </div>
      </div>

      {workout.instructions && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{workout.instructions}</p>
      )}

      {/* Workout segments preview */}
      {workout.segments && workout.segments.length > 0 && (
        <div className="space-y-1">
          {workout.segments.map((segment) => (
            <div key={segment.id} className="flex items-start gap-2 text-xs">
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {formatSegmentType(segment.type)}
              </Badge>
              <span className="text-muted-foreground line-clamp-2 flex-1 min-w-0">
                {/* Show exercise name for strength/plyo/core */}
                {segment.exercise && segment.exercise.nameSv ? (
                  <>
                    {segment.exercise.nameSv}
                    {segment.sets && segment.repsCount && (
                      <> ({segment.sets} set × {segment.repsCount} reps{segment.rest && ` med ${segment.rest}s vila`})</>
                    )}
                  </>
                ) : (
                  <>
                    {segment.description}
                    {segment.duration && ` (${segment.duration} min)`}
                    {segment.pace && ` @ ${formatPace(segment.pace)}`}
                    {segment.heartRate && segment.pace && (
                      <> | {segment.heartRate}</>
                    )}
                    {segment.heartRate && !segment.pace && (
                      <> @ {segment.heartRate}</>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        {workout.duration && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {workout.duration} min
          </span>
        )}
        {workout.distance && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            {workout.distance} km
          </span>
        )}
      </div>

      {isCompleted ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/athlete/workouts/${workout.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full min-h-[40px]">
              Visa logg
            </Button>
          </Link>
          <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full min-h-[40px]">
              Redigera
            </Button>
          </Link>
        </div>
      ) : (
        <Link href={`/athlete/workouts/${workout.id}/log`}>
          <Button className="w-full min-h-[44px]">Logga pass</Button>
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
    WARMUP: 'Uppvärmning',
    INTERVAL: 'Intervall',
    COOLDOWN: 'Nedvärmning',
    WORK: 'Arbete',
    REST: 'Vila',
    EXERCISE: 'Övning',
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
