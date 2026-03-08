'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  PartyPopper,
  Calendar,
  Dumbbell,
  Clock,
  Target,
  ArrowRight,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RaceContext {
  isRaceWorkout: boolean
  isProgramFinalWorkout: boolean
  programId: string
  programName: string
  goalType?: string | null
  goalRace?: string | null
  isLastWorkout: boolean
  totalWorkouts: number
  completedWorkouts: number
}

interface RaceResultData {
  finishTime: string
  finishTimeSeconds: number
  goalTime?: string
  goalAssessment?: 'EXCEEDED' | 'MET' | 'CLOSE' | 'MISSED'
}

interface ProgramCompletionCelebrationProps {
  raceContext: RaceContext
  raceResult?: RaceResultData
  basePath: string
}

// Confetti CSS animation (pure CSS, no external deps)
function ConfettiEffect() {
  const colors = [
    'bg-yellow-400',
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-400',
    'bg-teal-400',
  ]

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const color = colors[i % colors.length]
        const left = Math.random() * 100
        const delay = Math.random() * 3
        const duration = 2 + Math.random() * 3
        const size = 6 + Math.random() * 8

        return (
          <div
            key={i}
            className={cn('absolute rounded-sm', color)}
            style={{
              left: `${left}%`,
              top: '-10px',
              width: `${size}px`,
              height: `${size * 0.6}px`,
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        )
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            top: -10px;
            opacity: 1;
            transform: rotate(0deg) translateX(0);
          }
          100% {
            top: 110vh;
            opacity: 0;
            transform: rotate(720deg) translateX(${Math.random() > 0.5 ? '' : '-'}80px);
          }
        }
      `}</style>
    </div>
  )
}

const GOAL_ASSESSMENT_CONFIG = {
  EXCEEDED: {
    label: 'Mål överträffat!',
    color: 'bg-green-500 text-white',
    icon: TrendingUp,
  },
  MET: {
    label: 'Mål uppnått!',
    color: 'bg-blue-500 text-white',
    icon: CheckCircle2,
  },
  CLOSE: {
    label: 'Nära målet',
    color: 'bg-yellow-500 text-white',
    icon: Target,
  },
  MISSED: {
    label: 'Fortsätt kämpa',
    color: 'bg-orange-500 text-white',
    icon: Target,
  },
}

function formatGoalType(goalType: string | null | undefined): string {
  const types: Record<string, string> = {
    '5k': '5 km',
    '10k': '10 km',
    '5K': '5 km',
    '10K': '10 km',
    'half-marathon': 'Halvmaraton',
    marathon: 'Maraton',
    fitness: 'Fitness',
    cycling: 'Cykling',
    skiing: 'Skidåkning',
  }
  return types[goalType || ''] || goalType || ''
}

export function ProgramCompletionCelebration({
  raceContext,
  raceResult,
  basePath,
}: ProgramCompletionCelebrationProps) {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [fadeInAi, setFadeInAi] = useState(false)

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch AI congratulation message
  useEffect(() => {
    async function fetchCompletion() {
      try {
        const response = await fetch(`/api/programs/${raceContext.programId}/completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raceResult: raceResult
              ? {
                  finishTime: raceResult.finishTime,
                  goalTime: raceResult.goalTime,
                  goalAssessment: raceResult.goalAssessment,
                }
              : undefined,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setAiMessage(data.message)
          // Fade in after a short delay
          setTimeout(() => setFadeInAi(true), 200)
        }
      } catch (error) {
        console.error('Error fetching completion message:', error)
      } finally {
        setAiLoading(false)
      }
    }

    fetchCompletion()
  }, [raceContext.programId, raceResult])

  const totalWeeks = Math.ceil(
    (raceContext.completedWorkouts + 1) / (raceContext.totalWorkouts / 12 || 1)
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {showConfetti && <ConfettiEffect />}

      {/* Hero Header */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
          <PartyPopper className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Grattis! Du har slutfört
        </h1>
        <h2 className="text-2xl font-semibold text-primary">
          {raceContext.programName}
        </h2>
        {raceContext.goalType && (
          <Badge variant="secondary" className="mt-3 text-sm px-3 py-1">
            {formatGoalType(raceContext.goalType)}
          </Badge>
        )}
      </div>

      {/* Race Result Hero (only for race workouts with result) */}
      {raceContext.isRaceWorkout && raceResult && (
        <Card className="mb-6 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Din sluttid</p>
            <p className="text-5xl font-bold tracking-tight mb-3">
              {raceResult.finishTime}
            </p>
            {raceResult.goalAssessment && (
              <Badge
                className={cn(
                  'text-sm px-4 py-1',
                  GOAL_ASSESSMENT_CONFIG[raceResult.goalAssessment].color
                )}
              >
                {GOAL_ASSESSMENT_CONFIG[raceResult.goalAssessment].label}
              </Badge>
            )}
            {raceResult.goalTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Mål: {raceResult.goalTime}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Program Summary Stats */}
      <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 text-center">Din resa i siffror</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{raceContext.completedWorkouts + 1}</p>
              <p className="text-xs text-muted-foreground">Träningspass</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{raceContext.totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">Totalt planerade</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">
                {Math.round(
                  ((raceContext.completedWorkouts + 1) / raceContext.totalWorkouts) * 100
                )}
                %
              </p>
              <p className="text-xs text-muted-foreground">Genomfört</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">1</p>
              <p className="text-xs text-muted-foreground">Program klart!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Congratulation Message */}
      <Card
        className={cn(
          'mb-6 transition-all duration-700',
          fadeInAi ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <CardContent className="pt-6">
          {aiLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                Förbereder ett personligt meddelande...
              </span>
            </div>
          ) : aiMessage ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{aiMessage}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        <Button
          size="lg"
          className="w-full h-12"
          onClick={() => {
            router.push(`${basePath}/athlete/dashboard`)
            router.refresh()
          }}
        >
          Tillbaka till dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
