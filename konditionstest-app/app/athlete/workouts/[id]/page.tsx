// app/athlete/workouts/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Clock, MapPin, Heart, Zap, Calendar, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface WorkoutDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  const user = await requireAthlete()
  const { id } = await params

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch workout with full details
  const workout = await prisma.workout.findFirst({
    where: {
      id: id,
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                  clientId: true,
                  startDate: true,
                },
              },
            },
          },
        },
      },
      segments: {
        orderBy: {
          order: 'asc',
        },
        include: {
          exercise: true,
        },
      },
      logs: {
        where: {
          athleteId: user.id,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 1,
      },
    },
  })

  if (!workout || !workout.day.week.program) {
    notFound()
  }

  // Verify athlete has access to this program
  if (workout.day.week.program.clientId !== athleteAccount.clientId) {
    notFound()
  }

  const existingLog = workout.logs[0]
  const isCompleted = existingLog && existingLog.completed

  // Calculate workout date
  const programStartDate = new Date(workout.day.week.program.startDate)
  const dayOffset = (workout.day.week.weekNumber - 1) * 7 + (workout.day.dayNumber - 1)
  const workoutDate = new Date(programStartDate)
  workoutDate.setDate(workoutDate.getDate() + dayOffset)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href={`/athlete/programs/${workout.day.week.program.id}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{workout.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(workoutDate, 'EEEE, d MMMM yyyy', { locale: sv })}
              </span>
              <span>•</span>
              <span>
                Vecka {workout.day.week.weekNumber}, Dag {workout.day.dayNumber}
              </span>
            </div>
          </div>
          {isCompleted && (
            <Badge variant="default" className="bg-green-500 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Slutförd
            </Badge>
          )}
        </div>
      </div>

      {/* Workout Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Passinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {formatWorkoutType(workout.type)}
            </Badge>
            <Badge variant="outline" className={getIntensityBadgeClass(workout.intensity)}>
              {formatIntensity(workout.intensity)}
            </Badge>
          </div>

          {workout.instructions && (
            <div>
              <h4 className="font-semibold mb-2">Instruktioner</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {workout.instructions}
              </p>
            </div>
          )}

          {/* Planned metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            {workout.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Planerad tid</p>
                  <p className="font-semibold">{workout.duration} min</p>
                </div>
              </div>
            )}
            {workout.distance && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Planerad distans</p>
                  <p className="font-semibold">{workout.distance} km</p>
                </div>
              </div>
            )}
            {workout.targetHeartRate && (
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Målpuls</p>
                  <p className="font-semibold">{workout.targetHeartRate} slag/min</p>
                </div>
              </div>
            )}
            {workout.targetPace && (
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Måltempo</p>
                  <p className="font-semibold">{workout.targetPace}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workout Structure */}
      {workout.segments && workout.segments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pass-struktur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workout.segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {formatSegmentType(segment.type)}
                      </Badge>
                      {segment.exercise && (
                        <span className="font-medium">{segment.exercise.nameSv}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {segment.description}
                      {segment.duration && ` • ${segment.duration} min`}
                      {segment.pace && ` • ${segment.pace}`}
                      {segment.heartRate && ` • ${segment.heartRate}`}
                      {segment.sets && segment.repsCount && (
                        <> • {segment.sets} set × {segment.repsCount} reps</>
                      )}
                      {segment.rest && ` • ${segment.rest}s vila`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Workout Log */}
      {existingLog && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Din genomförda träning</CardTitle>
              <Link href={`/athlete/workouts/${workout.id}/log`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Redigera
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {existingLog.duration && (
                <div>
                  <p className="text-xs text-muted-foreground">Tid</p>
                  <p className="font-semibold">{existingLog.duration} min</p>
                </div>
              )}
              {existingLog.distance && (
                <div>
                  <p className="text-xs text-muted-foreground">Distans</p>
                  <p className="font-semibold">{existingLog.distance} km</p>
                </div>
              )}
              {existingLog.avgPace && (
                <div>
                  <p className="text-xs text-muted-foreground">Genomsnittstempo</p>
                  <p className="font-semibold">{existingLog.avgPace}</p>
                </div>
              )}
              {existingLog.avgHR && (
                <div>
                  <p className="text-xs text-muted-foreground">Genomsnittspuls</p>
                  <p className="font-semibold">{existingLog.avgHR} slag/min</p>
                </div>
              )}
            </div>

            {(existingLog.perceivedEffort || existingLog.difficulty) && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {existingLog.perceivedEffort && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">RPE</p>
                      <Badge variant="outline" className={getEffortBadgeClass(existingLog.perceivedEffort)}>
                        {existingLog.perceivedEffort}/10 - {getEffortLabel(existingLog.perceivedEffort)}
                      </Badge>
                    </div>
                  )}
                  {existingLog.difficulty && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Svårighetsgrad</p>
                      <Badge variant="outline">
                        {existingLog.difficulty}/10 - {getDifficultyLabel(existingLog.difficulty)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {existingLog.feeling && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-1">Känsla</p>
                <p className="text-sm">{existingLog.feeling}</p>
              </div>
            )}

            {existingLog.notes && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-1">Anteckningar</p>
                <p className="text-sm whitespace-pre-wrap">{existingLog.notes}</p>
              </div>
            )}

            {(existingLog.stravaUrl || existingLog.dataFileUrl) && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Externa länkar</p>
                <div className="flex gap-2">
                  {existingLog.stravaUrl && (
                    <a href={existingLog.stravaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        Visa på Strava
                      </Button>
                    </a>
                  )}
                  {existingLog.dataFileUrl && (
                    <a href={existingLog.dataFileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        Datafil
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {existingLog.coachFeedback && (
              <div className="border-t pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-600 text-white rounded-full p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-sm mb-1">
                        Feedback från coach
                      </p>
                      <p className="text-blue-900 text-sm whitespace-pre-wrap">
                        {existingLog.coachFeedback}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground border-t pt-4">
              Loggad {format(new Date(existingLog.completedAt), 'PPP HH:mm', { locale: sv })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isCompleted ? (
          <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Redigera logg
            </Button>
          </Link>
        ) : (
          <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
            <Button className="w-full">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Logga pass
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
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

function getEffortLabel(effort: number): string {
  if (effort <= 2) return 'Mycket lätt'
  if (effort <= 4) return 'Lätt'
  if (effort <= 6) return 'Måttlig'
  if (effort <= 8) return 'Hård'
  return 'Maximal'
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Lättare än förväntat'
  if (difficulty <= 5) return 'Som förväntat'
  if (difficulty <= 7) return 'Svårare än förväntat'
  return 'Mycket svårt'
}

function getEffortBadgeClass(effort: number): string {
  if (effort <= 3) return 'border-green-300 text-green-700'
  if (effort <= 5) return 'border-yellow-300 text-yellow-700'
  if (effort <= 7) return 'border-orange-300 text-orange-700'
  return 'border-red-300 text-red-700'
}
