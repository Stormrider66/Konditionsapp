'use client'

/**
 * WOD Execution Page
 *
 * Displays and executes an AI-generated Workout of the Day.
 * Fetches the saved WOD from the database and shows it in focus mode.
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Dumbbell,
  Timer,
  Flame,
  Target,
  Clock,
  Loader2,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
} from 'lucide-react'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { cn } from '@/lib/utils'
import type { WODWorkout, WODSection, WODExercise, WODSectionType } from '@/types/wod'

interface PageProps {
  params: Promise<{ id: string }>
}

// Section icons
const SECTION_ICONS: Record<WODSectionType, typeof Flame> = {
  WARMUP: Flame,
  MAIN: Dumbbell,
  CORE: Target,
  COOLDOWN: Clock,
}

const SECTION_COLORS: Record<WODSectionType, string> = {
  WARMUP: 'text-yellow-500',
  MAIN: 'text-blue-500',
  CORE: 'text-purple-500',
  COOLDOWN: 'text-green-500',
}

interface FlattenedExercise extends WODExercise {
  sectionType: WODSectionType
  sectionName: string
  globalIndex: number
}

export default function WODExecutionPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<WODWorkout | null>(null)
  const [wodId, setWodId] = useState<string | null>(null)

  // Exercise navigation state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())

  // Rest timer state
  const [isResting, setIsResting] = useState(false)
  const [restTimeLeft, setRestTimeLeft] = useState(0)

  // Flatten exercises for navigation
  const flattenedExercises: FlattenedExercise[] = workout?.sections.flatMap((section, sectionIdx) =>
    section.exercises.map((exercise, exIdx) => ({
      ...exercise,
      sectionType: section.type,
      sectionName: section.name,
      globalIndex: workout.sections
        .slice(0, sectionIdx)
        .reduce((sum, s) => sum + s.exercises.length, 0) + exIdx,
    }))
  ) || []

  const currentExercise = flattenedExercises[currentIndex]
  const totalExercises = flattenedExercises.length
  const progressPercent = totalExercises > 0 ? (completedExercises.size / totalExercises) * 100 : 0

  // Fetch WOD data
  useEffect(() => {
    async function fetchWOD() {
      try {
        const response = await fetch(`/api/ai/wod?id=${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch WOD')
        }
        const data = await response.json()

        if (!data.workoutJson) {
          throw new Error('WOD data not found')
        }

        console.log('WOD fetched, data.id:', data.id)
        setWorkout(data.workoutJson as WODWorkout)
        setWodId(data.id)

        // Mark WOD as started
        await fetch('/api/ai/wod', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wodId: data.id, status: 'STARTED' }),
        })
      } catch (err) {
        console.error('Failed to fetch WOD:', err)
        setError(err instanceof Error ? err.message : 'Failed to load workout')
      } finally {
        setLoading(false)
      }
    }

    fetchWOD()
  }, [id])

  // Rest timer effect
  useEffect(() => {
    if (!isResting || restTimeLeft <= 0) return

    const timer = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          setIsResting(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isResting, restTimeLeft])

  // Navigation handlers
  const goToNext = () => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const markComplete = () => {
    setCompletedExercises(prev => new Set(prev).add(currentIndex))

    // Start rest timer if exercise has rest defined
    const restSeconds = currentExercise?.restSeconds
    if (restSeconds && restSeconds > 0 && currentIndex < totalExercises - 1) {
      setRestTimeLeft(restSeconds)
      setIsResting(true)
    } else {
      goToNext()
    }
  }

  const skipRest = () => {
    setIsResting(false)
    setRestTimeLeft(0)
    goToNext()
  }

  const handleClose = async () => {
    // Update status based on completion
    if (wodId) {
      const isComplete = completedExercises.size >= totalExercises
      await fetch('/api/ai/wod', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wodId,
          status: isComplete ? 'COMPLETED' : 'ABANDONED',
        }),
      })
    }
    router.push('/athlete/dashboard')
  }

  const handleComplete = async () => {
    console.log('handleComplete called, wodId:', wodId)
    if (wodId) {
      try {
        const response = await fetch('/api/ai/wod', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wodId,
            status: 'COMPLETED',
          }),
        })
        const data = await response.json()
        console.log('PATCH response:', response.status, data)
      } catch (err) {
        console.error('Failed to save WOD completion:', err)
      }
    } else {
      console.warn('No wodId available to save')
    }
    router.push('/athlete/dashboard')
  }

  const handleRepeat = async () => {
    if (!wodId) return

    try {
      const response = await fetch('/api/ai/wod/repeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wodId }),
      })

      if (!response.ok) {
        throw new Error('Failed to repeat WOD')
      }

      const data = await response.json()
      router.push(`/athlete/wod/${data.newWodId}`)
    } catch (err) {
      console.error('Failed to repeat WOD:', err)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-muted-foreground">Laddar pass...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !workout) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full">
          <GlassCardContent className="p-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Kunde inte ladda passet</h2>
            <p className="text-muted-foreground mb-4">{error || 'Okänt fel'}</p>
            <Button onClick={() => router.push('/athlete/dashboard')}>
              Tillbaka till dashboard
            </Button>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  // Rest timer screen
  if (isResting) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Vila</h2>
          <div className="text-7xl font-bold text-orange-500 mb-4">
            {restTimeLeft}
          </div>
          <p className="text-muted-foreground mb-8">sekunder kvar</p>
          <Button onClick={skipRest} variant="outline" size="lg">
            <SkipForward className="h-4 w-4 mr-2" />
            Hoppa över
          </Button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {completedExercises.size} av {totalExercises} övningar klara
          </p>
        </div>
      </div>
    )
  }

  // All exercises completed
  if (completedExercises.size >= totalExercises && currentIndex >= totalExercises - 1) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Bra jobbat!</h2>
          <p className="text-xl text-muted-foreground mb-2">{workout.title}</p>
          <p className="text-muted-foreground mb-8">
            Du har slutfört alla {totalExercises} övningar
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleComplete}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              Avsluta pass
            </Button>
            <Button
              onClick={handleRepeat}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Gör om detta pass
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main exercise view
  const SectionIcon = SECTION_ICONS[currentExercise?.sectionType || 'MAIN']
  const isCompleted = completedExercises.has(currentIndex)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={handleClose} className="p-2 -ml-2 hover:bg-muted rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{workout.title}</p>
          <p className="text-xs text-muted-foreground">
            Övning {currentIndex + 1} av {totalExercises}
          </p>
        </div>
        <div className="w-9" /> {/* Spacer for alignment */}
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="h-1" />

      {/* Section badge */}
      <div className="p-4 pb-0">
        <Badge variant="outline" className="gap-1">
          <SectionIcon className={cn('h-3 w-3', SECTION_COLORS[currentExercise?.sectionType || 'MAIN'])} />
          {currentExercise?.sectionName}
        </Badge>
      </div>

      {/* Exercise content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Exercise image */}
        {currentExercise?.imageUrls && currentExercise.imageUrls.length > 0 && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-muted">
            <ExerciseImage
              images={currentExercise.imageUrls}
              alt={currentExercise.nameSv || currentExercise.name}
              variant="hero"
            />
          </div>
        )}

        {/* Exercise name */}
        <h1 className="text-2xl font-bold mb-2">
          {currentExercise?.nameSv || currentExercise?.name}
        </h1>

        {/* Exercise details */}
        <div className="flex flex-wrap gap-3 mb-4">
          {currentExercise?.sets && currentExercise?.reps && (
            <Badge variant="secondary" className="text-sm">
              {currentExercise.sets} × {currentExercise.reps}
            </Badge>
          )}
          {currentExercise?.duration && !currentExercise?.sets && (
            <Badge variant="secondary" className="text-sm">
              <Timer className="h-3 w-3 mr-1" />
              {currentExercise.duration}s
            </Badge>
          )}
          {currentExercise?.restSeconds && (
            <Badge variant="outline" className="text-sm">
              Vila: {currentExercise.restSeconds}s
            </Badge>
          )}
        </div>

        {/* Instructions */}
        {currentExercise?.instructions && (
          <GlassCard className="mb-4">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                {currentExercise.instructions}
              </p>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Completion status */}
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Markerad som klar</span>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Föregående
          </Button>

          {!isCompleted ? (
            <Button
              size="lg"
              onClick={markComplete}
              className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Klar
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={goToNext}
              disabled={currentIndex >= totalExercises - 1}
              className="flex-[2]"
            >
              Nästa
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
