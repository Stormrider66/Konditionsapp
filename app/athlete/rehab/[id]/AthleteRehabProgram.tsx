'use client'

/**
 * Athlete Rehab Program Component
 *
 * Shows full program details with exercises, milestones,
 * and progress logging capabilities.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  ArrowLeft,
  Stethoscope,
  Dumbbell,
  Target,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  MessageCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { RehabExercisePlayer } from '@/components/athlete/RehabExercisePlayer'
import { RehabProgressLogger } from '@/components/athlete/RehabProgressLogger'

interface RehabExercise {
  id: string
  exerciseId: string
  exercise: {
    id: string
    name: string
    nameSv?: string
    videoUrl?: string
    instructions?: string
    instructionsSv?: string
    cues?: string[]
  }
  sets: number
  reps?: number
  holdSeconds?: number
  restSeconds?: number
  frequency: string
  notes?: string
  progressionCriteria?: string
  order: number
}

interface RehabMilestone {
  id: string
  name: string
  description?: string
  criteria?: string
  order: number
  achieved: boolean
  achievedAt?: string
}

interface ProgressLog {
  id: string
  loggedAt: string
  painDuring?: number
  painAfter?: number
  difficulty?: string
  overallFeeling?: string
  notes?: string
  loggedBy: {
    id: string
    name: string
    role: string
  }
}

interface RehabProgram {
  id: string
  name: string
  description?: string
  currentPhase: string
  status: string
  createdAt: string
  estimatedEndDate?: string
  shortTermGoals: string[]
  longTermGoals: string[]
  contraindications: string[]
  precautions: string[]
  acceptablePainDuring: number
  acceptablePainAfter: number
  notes?: string
  exercises: RehabExercise[]
  milestones: RehabMilestone[]
  physio?: {
    id: string
    name: string
  }
}

interface AthleteRehabProgramProps {
  programId: string
}

const PHASE_LABELS: Record<string, string> = {
  ACUTE: 'Akut fas',
  SUBACUTE: 'Subakut fas',
  REMODELING: 'Remodelleringsfas',
  FUNCTIONAL: 'Funktionell fas',
  RETURN_TO_SPORT: 'Återgång till idrott',
}

const PHASE_DESCRIPTIONS: Record<string, string> = {
  ACUTE: 'Fokus på att minska inflammation och smärta. Begränsad belastning.',
  SUBACUTE: 'Gradvis ökad rörlighet och lättare styrketräning.',
  REMODELING: 'Ökad styrketräning och funktionella övningar.',
  FUNCTIONAL: 'Sportspecifik träning och belastningstestning.',
  RETURN_TO_SPORT: 'Full träning med fokus på prestandaåtergång.',
}

export function AthleteRehabProgram({ programId }: AthleteRehabProgramProps) {
  const router = useRouter()
  const [program, setProgram] = useState<RehabProgram | null>(null)
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [showProgressLogger, setShowProgressLogger] = useState(false)

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true)

      try {
        const [programRes, progressRes] = await Promise.all([
          fetch(`/api/physio/rehab-programs/${programId}`),
          fetch(`/api/physio/rehab-programs/${programId}/progress?limit=10`),
        ])

        if (programRes.ok) {
          const programData = await programRes.json()
          setProgram(programData)
        }

        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setProgressLogs(progressData.logs || [])
        }
      } catch (err) {
        console.error('Error fetching program:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgram()
  }, [programId])

  const handleExerciseComplete = async (
    exerciseId: string,
    data: { painDuring: number; painAfter: number; notes?: string }
  ) => {
    // Individual exercise completion could be tracked here
    console.log('Exercise completed:', exerciseId, data)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (!program) {
    return (
      <GlassCard>
        <GlassCardContent className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="font-medium">Program hittades inte</p>
          <Button variant="ghost" onClick={() => router.push('/athlete/rehab')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // If viewing an exercise
  if (selectedExerciseIndex !== null) {
    const exercise = program.exercises[selectedExerciseIndex]
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedExerciseIndex(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka till program
        </Button>

        <RehabExercisePlayer
          exercise={exercise}
          exerciseIndex={selectedExerciseIndex}
          totalExercises={program.exercises.length}
          acceptablePainDuring={program.acceptablePainDuring}
          acceptablePainAfter={program.acceptablePainAfter}
          onComplete={handleExerciseComplete}
          onPrevious={() =>
            setSelectedExerciseIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
          }
          onNext={() =>
            setSelectedExerciseIndex((prev) =>
              prev !== null && prev < program.exercises.length - 1 ? prev + 1 : prev
            )
          }
        />
      </div>
    )
  }

  // If logging progress
  if (showProgressLogger) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setShowProgressLogger(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>

        <RehabProgressLogger
          programId={programId}
          programName={program.name}
          exerciseCount={program.exercises.length}
          acceptablePainDuring={program.acceptablePainDuring}
          acceptablePainAfter={program.acceptablePainAfter}
          onSuccess={() => {
            setShowProgressLogger(false)
            // Refresh progress logs
            fetch(`/api/physio/rehab-programs/${programId}/progress?limit=10`)
              .then((res) => res.json())
              .then((data) => setProgressLogs(data.logs || []))
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/athlete/rehab')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>

        <Button
          onClick={() => setShowProgressLogger(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Logga pass
        </Button>
      </div>

      {/* Program info */}
      <GlassCard className="border-teal-500/20">
        <GlassCardHeader>
          <div className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6 text-teal-500" />
            <div>
              <GlassCardTitle className="text-2xl">{program.name}</GlassCardTitle>
              {program.physio && (
                <p className="text-sm text-slate-500">Fysioterapeut: {program.physio.name}</p>
              )}
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {/* Phase info */}
          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500">
                Aktuell fas
              </span>
              <Badge variant="outline" className="text-teal-400 border-teal-500/30">
                {PHASE_LABELS[program.currentPhase]}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">
              {PHASE_DESCRIPTIONS[program.currentPhase]}
            </p>
          </div>

          {/* Description */}
          {program.description && (
            <p className="text-slate-300">{program.description}</p>
          )}

          {/* Pain thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">
                Max smärta under
              </p>
              <p className="text-2xl font-black text-white">{program.acceptablePainDuring}/10</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">
                Max smärta efter
              </p>
              <p className="text-2xl font-black text-white">{program.acceptablePainAfter}/10</p>
            </div>
          </div>

          {/* Precautions */}
          {program.precautions.length > 0 && (
            <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2">
                Försiktighetsåtgärder
              </p>
              <ul className="space-y-1">
                {program.precautions.map((p, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Tabs */}
      <Tabs defaultValue="exercises" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="exercises" className="data-[state=active]:bg-teal-500 rounded-lg">
            <Dumbbell className="h-4 w-4 mr-2" />
            Övningar ({program.exercises.length})
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-teal-500 rounded-lg">
            <Target className="h-4 w-4 mr-2" />
            Milstolpar ({program.milestones.length})
          </TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-teal-500 rounded-lg">
            <Activity className="h-4 w-4 mr-2" />
            Historik
          </TabsTrigger>
        </TabsList>

        {/* Exercises tab */}
        <TabsContent value="exercises" className="space-y-3">
          {program.exercises.map((exercise, idx) => (
            <div
              key={exercise.id}
              onClick={() => setSelectedExerciseIndex(idx)}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {exercise.exercise.nameSv || exercise.exercise.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{exercise.sets} set</span>
                      {exercise.reps && <span>× {exercise.reps} reps</span>}
                      {exercise.holdSeconds && <span>× {exercise.holdSeconds}s</span>}
                    </div>
                  </div>
                </div>
                {exercise.exercise.videoUrl ? (
                  <Play className="h-5 w-5 text-teal-500" />
                ) : (
                  <Dumbbell className="h-5 w-5 text-slate-500" />
                )}
              </div>
              {exercise.notes && (
                <p className="text-xs text-slate-400 mt-2 pl-11">{exercise.notes}</p>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Milestones tab */}
        <TabsContent value="milestones" className="space-y-3">
          {program.milestones.map((milestone, idx) => (
            <div
              key={milestone.id}
              className={cn(
                'p-4 rounded-2xl border',
                milestone.achieved
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/5'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    milestone.achieved
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-slate-400'
                  )}
                >
                  {milestone.achieved ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn('font-bold', milestone.achieved ? 'text-green-400' : 'text-white')}>
                    {milestone.name}
                  </p>
                  {milestone.description && (
                    <p className="text-sm text-slate-400 mt-1">{milestone.description}</p>
                  )}
                  {milestone.criteria && (
                    <p className="text-xs text-slate-500 mt-2">Kriterium: {milestone.criteria}</p>
                  )}
                  {milestone.achievedAt && (
                    <p className="text-xs text-green-500 mt-2">
                      Uppnådd: {formatDate(milestone.achievedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {program.milestones.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Inga milstolpar definierade</p>
            </div>
          )}
        </TabsContent>

        {/* Progress history tab */}
        <TabsContent value="progress" className="space-y-3">
          {progressLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{formatDate(log.loggedAt)}</span>
                {log.overallFeeling && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      log.overallFeeling === 'GOOD' && 'border-green-500/30 text-green-400',
                      log.overallFeeling === 'NEUTRAL' && 'border-yellow-500/30 text-yellow-400',
                      log.overallFeeling === 'BAD' && 'border-red-500/30 text-red-400'
                    )}
                  >
                    {log.overallFeeling === 'GOOD' && 'Bra'}
                    {log.overallFeeling === 'NEUTRAL' && 'Okej'}
                    {log.overallFeeling === 'BAD' && 'Dåligt'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {log.painDuring !== undefined && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Smärta under
                    </p>
                    <p className="text-lg font-black text-white">{log.painDuring}/10</p>
                  </div>
                )}
                {log.painAfter !== undefined && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Smärta efter
                    </p>
                    <p className="text-lg font-black text-white">{log.painAfter}/10</p>
                  </div>
                )}
              </div>

              {log.notes && <p className="text-sm text-slate-400 mt-3">{log.notes}</p>}
            </div>
          ))}

          {progressLogs.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Ingen träningshistorik än</p>
              <Button
                variant="outline"
                onClick={() => setShowProgressLogger(true)}
                className="mt-4 border-teal-500/30 text-teal-400"
              >
                Logga ditt första pass
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goals */}
      {(program.shortTermGoals.length > 0 || program.longTermGoals.length > 0) && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">Mål</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            {program.shortTermGoals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                  Kortsiktiga mål
                </p>
                <ul className="space-y-1">
                  {program.shortTermGoals.map((goal, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <Target className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {program.longTermGoals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                  Långsiktiga mål
                </p>
                <ul className="space-y-1">
                  {program.longTermGoals.map((goal, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}
