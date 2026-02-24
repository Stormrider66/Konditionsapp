'use client'

/**
 * StrengthSessionCard Component
 *
 * Displays a strength session assignment to an athlete.
 * Includes sections overview, exercise count, and focus mode launch.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Play,
  Clock,
  Dumbbell,
  CheckCircle2,
  Flame,
  Target,
  Timer,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { FocusModeWorkout } from './FocusModeWorkout'
import { WorkoutStartScreen } from './WorkoutStartScreen'

interface StrengthSessionCardProps {
  assignment: {
    id: string
    assignedDate: string
    status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
    completedAt?: string | null
    rpe?: number | null
    duration?: number | null
    notes?: string | null
    session: {
      id: string
      name: string
      description?: string | null
      phase: string
      estimatedDuration?: number | null
      totalExercises: number
      totalSets: number
      hasWarmup: boolean
      hasCore: boolean
      hasCooldown: boolean
    }
    progress: {
      completedSets: number
      lastActivity: string | null
    }
  }
  onComplete?: () => void
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  ANATOMICAL_ADAPTATION: { label: 'AA', color: 'bg-green-100 text-green-800' },
  MAX_STRENGTH: { label: 'Max', color: 'bg-purple-100 text-purple-800' },
  POWER: { label: 'Power', color: 'bg-red-100 text-red-800' },
  MAINTENANCE: { label: 'Underhåll', color: 'bg-blue-100 text-blue-800' },
  TAPER: { label: 'Taper', color: 'bg-yellow-100 text-yellow-800' },
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Ej påbörjad',
    color: 'bg-gray-100 text-gray-700',
    icon: null,
  },
  SCHEDULED: {
    label: 'Schemalagd',
    color: 'bg-blue-100 text-blue-700',
    icon: null,
  },
  COMPLETED: {
    label: 'Klar',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  SKIPPED: {
    label: 'Överhoppad',
    color: 'bg-gray-200 text-gray-500',
    icon: null,
  },
  MODIFIED: {
    label: 'Modifierad',
    color: 'bg-yellow-100 text-yellow-700',
    icon: null,
  },
}

export function StrengthSessionCard({
  assignment,
  onComplete,
}: StrengthSessionCardProps) {
  const [showStartScreen, setShowStartScreen] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)

  const { session, progress, status } = assignment
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const phaseConfig = PHASE_LABELS[session.phase] || {
    label: session.phase,
    color: 'bg-gray-100 text-gray-800',
  }

  // Calculate progress percentage
  const progressPercent = session.totalSets > 0
    ? Math.round((progress.completedSets / session.totalSets) * 100)
    : 0

  // Format date
  const assignedDate = new Date(assignment.assignedDate)
  const isToday = new Date().toDateString() === assignedDate.toDateString()
  const dateLabel = isToday
    ? 'Idag'
    : assignedDate.toLocaleDateString('sv-SE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  // Handle close/complete
  const handleClose = () => {
    setShowStartScreen(false)
    setShowFocusMode(false)
    if (onComplete) onComplete()
  }

  // Start workout (from start screen)
  const handleStartWorkout = () => {
    setShowStartScreen(false)
    setShowFocusMode(true)
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={phaseConfig.color} variant="secondary">
                  {phaseConfig.label}
                </Badge>
                <Badge className={statusConfig.color} variant="secondary">
                  {statusConfig.icon && (
                    <statusConfig.icon className="h-3 w-3 mr-1" />
                  )}
                  {statusConfig.label}
                </Badge>
              </div>
              <CardTitle className="text-lg truncate">{session.name}</CardTitle>
              {session.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{dateLabel}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar (if in progress) */}
          {progressPercent > 0 && status !== 'COMPLETED' && status !== 'SKIPPED' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Framsteg</span>
                <span className="font-medium">
                  {progress.completedSets} / {session.totalSets} set
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Session overview */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{session.totalExercises}</p>
              <p className="text-xs text-muted-foreground">Övningar</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{session.totalSets}</p>
              <p className="text-xs text-muted-foreground">Set</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">
                {session.estimatedDuration || '—'}
              </p>
              <p className="text-xs text-muted-foreground">min</p>
            </div>
          </div>

          {/* Section badges */}
          <div className="flex flex-wrap gap-2">
            {session.hasWarmup && (
              <Badge variant="outline" className="text-xs">
                <Flame className="h-3 w-3 mr-1 text-yellow-500" />
                Uppvärmning
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Dumbbell className="h-3 w-3 mr-1 text-blue-500" />
              Huvudpass
            </Badge>
            {session.hasCore && (
              <Badge variant="outline" className="text-xs">
                <Target className="h-3 w-3 mr-1 text-purple-500" />
                Core
              </Badge>
            )}
            {session.hasCooldown && (
              <Badge variant="outline" className="text-xs">
                <Timer className="h-3 w-3 mr-1 text-green-500" />
                Nedvarvning
              </Badge>
            )}
          </div>

          {/* Coach notes */}
          {assignment.notes && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-yellow-800 font-medium mb-1">
                Coach-anteckning:
              </p>
              <p className="text-sm text-yellow-900">{assignment.notes}</p>
            </div>
          )}

          {/* Completed info */}
          {status === 'COMPLETED' && (
            <div className="bg-green-50 p-3 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Pass avslutat!
                </p>
                {assignment.rpe && (
                  <p className="text-xs text-green-700">
                    RPE: {assignment.rpe}/10
                    {assignment.duration && ` • ${assignment.duration} min`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {status !== 'COMPLETED' && status !== 'SKIPPED' && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowStartScreen(true)}
            >
              <Play className="h-5 w-5 mr-2" />
              {progressPercent > 0 ? 'Fortsätt pass' : 'Starta pass'}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          )}

          {status === 'COMPLETED' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStartScreen(true)}
            >
              Visa detaljer
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Workout Start Screen */}
      {showStartScreen && (
        <WorkoutStartScreen
          assignmentId={assignment.id}
          onStart={handleStartWorkout}
          onBack={() => setShowStartScreen(false)}
        />
      )}

      {/* Focus Mode */}
      {showFocusMode && (
        <FocusModeWorkout
          assignmentId={assignment.id}
          onClose={handleClose}
        />
      )}
    </>
  )
}

export default StrengthSessionCard
