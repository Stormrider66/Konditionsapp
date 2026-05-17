'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  PartyPopper,
  Calendar,
  Dumbbell,
  Target,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Coffee,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewProgramDialog } from './NewProgramDialog'
import type { AthleteContext } from './WorkoutLogClient'
import { useTranslations } from '@/i18n/client'

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

interface VDOTData {
  vdot: number
  trainingPaces: unknown
  equivalentTimes: unknown
}

interface ProgramCompletionCelebrationProps {
  raceContext: RaceContext
  raceResult?: RaceResultData
  vdotData?: VDOTData
  basePath: string
  athleteContext?: AthleteContext
}

// Confetti CSS animation (pure CSS, no external deps)
function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000
  return value - Math.floor(value)
}

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
        const left = seededRandom(i + 1) * 100
        const delay = seededRandom(i + 101) * 3
        const duration = 2 + seededRandom(i + 201) * 3
        const size = 6 + seededRandom(i + 301) * 8
        const rotation = seededRandom(i + 401) * 360
        const drift = seededRandom(i + 501) > 0.5 ? 80 : -80

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
              transform: `rotate(${rotation}deg)`,
              ['--confetti-drift' as string]: `${drift}px`,
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
            transform: rotate(720deg) translateX(var(--confetti-drift));
          }
        }
      `}</style>
    </div>
  )
}

const GOAL_ASSESSMENT_CONFIG = {
  EXCEEDED: {
    labelKey: 'goalAssessment.exceeded',
    color: 'bg-green-500 text-white',
    icon: TrendingUp,
  },
  MET: {
    labelKey: 'goalAssessment.met',
    color: 'bg-blue-500 text-white',
    icon: CheckCircle2,
  },
  CLOSE: {
    labelKey: 'goalAssessment.close',
    color: 'bg-yellow-500 text-white',
    icon: Target,
  },
  MISSED: {
    labelKey: 'goalAssessment.missed',
    color: 'bg-orange-500 text-white',
    icon: Target,
  },
}

function formatGoalType(goalType: string | null | undefined, t: (key: string) => string): string {
  const types: Record<string, string> = {
    '5k': '5 km',
    '10k': '10 km',
    '5K': '5 km',
    '10K': '10 km',
    'half-marathon': 'goalTypes.halfMarathon',
    marathon: 'goalTypes.marathon',
    fitness: 'Fitness',
    cycling: 'goalTypes.cycling',
    skiing: 'goalTypes.skiing',
  }
  const label = types[goalType || '']
  return label ? (label.includes('.') ? t(label) : label) : goalType || ''
}

export function ProgramCompletionCelebration({
  raceContext,
  raceResult,
  vdotData,
  basePath,
  athleteContext,
}: ProgramCompletionCelebrationProps) {
  const t = useTranslations('components.programCompletionCelebration')
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [fadeInAi, setFadeInAi] = useState(false)
  const [showNewProgramDialog, setShowNewProgramDialog] = useState(false)
  const [notifyingCoach, setNotifyingCoach] = useState(false)
  const [coachNotified, setCoachNotified] = useState(false)

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

    void fetchCompletion()
  }, [raceContext.programId, raceResult])

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {showConfetti && <ConfettiEffect />}

      {/* Hero Header */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
          <PartyPopper className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {t('hero.title')}
        </h1>
        <h2 className="text-2xl font-semibold text-primary">
          {raceContext.programName}
        </h2>
        {raceContext.goalType && (
          <Badge variant="secondary" className="mt-3 text-sm px-3 py-1">
            {formatGoalType(raceContext.goalType, t)}
          </Badge>
        )}
      </div>

      {/* Race Result Hero (only for race workouts with result) */}
      {raceContext.isRaceWorkout && raceResult && (
        <Card className="mb-6 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">{t('race.finishTime')}</p>
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
                {t(GOAL_ASSESSMENT_CONFIG[raceResult.goalAssessment].labelKey)}
              </Badge>
            )}
            {raceResult.goalTime && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('race.goalTime', { time: raceResult.goalTime })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* VDOT Card (shown when VDOT was calculated from race) */}
      {vdotData && (
        <Card className="mb-6 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">{t('vdot.title')}</p>
            <p className="text-5xl font-bold tracking-tight mb-2">
              {vdotData.vdot.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('vdot.description')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Program Summary Stats */}
      <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 text-center">{t('stats.title')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{raceContext.completedWorkouts + 1}</p>
              <p className="text-xs text-muted-foreground">{t('stats.workouts')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{raceContext.totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">{t('stats.totalPlanned')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">
                {Math.round(
                  ((raceContext.completedWorkouts + 1) / raceContext.totalWorkouts) * 100
                )}
                %
              </p>
              <p className="text-xs text-muted-foreground">{t('stats.completed')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">1</p>
              <p className="text-xs text-muted-foreground">{t('stats.programDone')}</p>
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
                {t('ai.loading')}
              </span>
            </div>
          ) : aiMessage ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{aiMessage}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* What's Next? Section */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        <h3 className="text-lg font-semibold text-center mb-4">{t('next.title')}</h3>
        <div className="space-y-3">
          {/* Option 1: Create new program OR Notify coach */}
          {athleteContext?.hasCoach && !athleteContext?.isAICoached ? (
            <button
              onClick={async () => {
                if (coachNotified) return
                setNotifyingCoach(true)
                try {
                  const res = await fetch(`/api/programs/${raceContext.programId}/request-next`, {
                    method: 'POST',
                  })
                  if (res.ok) {
                    setCoachNotified(true)
                  }
                } catch {
                  // Silently handle error
                } finally {
                  setNotifyingCoach(false)
                }
              }}
              disabled={notifyingCoach || coachNotified}
              className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left disabled:opacity-60"
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                {notifyingCoach ? (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                ) : coachNotified ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1">
                  {coachNotified ? t('next.coach.notifiedTitle') : t('next.coach.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {coachNotified
                    ? t('next.coach.notifiedDescription')
                    : t('next.coach.description')}
                </p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowNewProgramDialog(true)}
              className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left"
            >
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1">{t('next.newProgram.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('next.newProgram.description')}
                </p>
              </div>
            </button>
          )}

          {/* Option 2: Take a break */}
          <button
            onClick={() => {
              router.push(`${basePath}/athlete/dashboard`)
              router.refresh()
            }}
            className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left"
          >
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Coffee className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base mb-1">{t('next.break.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('next.break.description')}
              </p>
            </div>
          </button>

          {/* Option 3: Train freely */}
          <button
            onClick={() => {
              router.push(`${basePath}/athlete/dashboard`)
              router.refresh()
            }}
            className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left"
          >
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="h-6 w-6 text-green-600 dark:text-green-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base mb-1">{t('next.freeTraining.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('next.freeTraining.description')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* New Program Dialog */}
      <NewProgramDialog
        open={showNewProgramDialog}
        onOpenChange={setShowNewProgramDialog}
        isAICoached={athleteContext?.isAICoached ?? false}
        primarySport={athleteContext?.primarySport ?? null}
        basePath={basePath}
        completedProgramId={raceContext.programId}
      />
    </div>
  )
}
