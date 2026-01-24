'use client'

/**
 * Rehab Exercise Player Component
 *
 * Displays a rehab exercise with video demo, instructions,
 * and progress logging capabilities.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Clock,
  Repeat,
  Info,
} from 'lucide-react'

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

interface RehabExercisePlayerProps {
  exercise: RehabExercise
  exerciseIndex: number
  totalExercises: number
  acceptablePainDuring?: number
  acceptablePainAfter?: number
  onComplete?: (exerciseId: string, data: { painDuring: number; painAfter: number; notes?: string }) => void
  onPrevious?: () => void
  onNext?: () => void
  variant?: 'default' | 'glass'
}

export function RehabExercisePlayer({
  exercise,
  exerciseIndex,
  totalExercises,
  acceptablePainDuring = 3,
  acceptablePainAfter = 5,
  onComplete,
  onPrevious,
  onNext,
  variant = 'glass',
}: RehabExercisePlayerProps) {
  const isGlass = variant === 'glass'
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSet, setCurrentSet] = useState(1)
  const [painDuring, setPainDuring] = useState(0)
  const [painAfter, setPainAfter] = useState(0)
  const [notes, setNotes] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  const getPainColor = (value: number, acceptable: number) => {
    if (value <= acceptable) return 'text-green-400'
    if (value <= acceptable + 2) return 'text-yellow-400'
    return 'text-red-400'
  }

  const handleComplete = () => {
    setIsCompleted(true)
    if (onComplete) {
      onComplete(exercise.id, {
        painDuring,
        painAfter,
        notes: notes || undefined,
      })
    }
  }

  const handleNextSet = () => {
    if (currentSet < exercise.sets) {
      setCurrentSet((prev) => prev + 1)
    }
  }

  const handlePreviousSet = () => {
    if (currentSet > 1) {
      setCurrentSet((prev) => prev - 1)
    }
  }

  const exerciseName = exercise.exercise.nameSv || exercise.exercise.name
  const instructions = exercise.exercise.instructionsSv || exercise.exercise.instructions

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={exerciseIndex === 0}
          className="text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Föregående
        </Button>

        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Övning
          </span>
          <p className="text-lg font-black text-white tabular-nums">
            {exerciseIndex + 1} / {totalExercises}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={onNext}
          disabled={exerciseIndex === totalExercises - 1}
          className="text-slate-400 hover:text-white"
        >
          Nästa
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>

      {/* Video player */}
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardContent className="p-0">
          {exercise.exercise.videoUrl ? (
            <div className="relative aspect-video bg-black rounded-t-3xl overflow-hidden">
              <iframe
                src={exercise.exercise.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video bg-slate-900 rounded-t-3xl flex items-center justify-center">
              <div className="text-center">
                <Dumbbell className="h-16 w-16 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">Ingen video tillgänglig</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Exercise name and prescription */}
            <div>
              <h2 className="text-xl font-black text-white">{exerciseName}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Repeat className="h-4 w-4" />
                  <span>{exercise.sets} set</span>
                </div>
                {exercise.reps && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Dumbbell className="h-4 w-4" />
                    <span>{exercise.reps} reps</span>
                  </div>
                )}
                {exercise.holdSeconds && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>{exercise.holdSeconds}s håll</span>
                  </div>
                )}
              </div>
            </div>

            {/* Set counter */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousSet}
                disabled={currentSet === 1}
                className="text-slate-400"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Set</p>
                <p className="text-4xl font-black text-teal-400 tabular-nums">
                  {currentSet}/{exercise.sets}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextSet}
                disabled={currentSet === exercise.sets}
                className="text-slate-400"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Instructions */}
            {instructions && (
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                    Instruktioner
                  </span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-line">{instructions}</p>
              </div>
            )}

            {/* Cues */}
            {exercise.exercise.cues && exercise.exercise.cues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {exercise.exercise.cues.map((cue, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-teal-500/30 text-teal-400"
                  >
                    {cue}
                  </Badge>
                ))}
              </div>
            )}

            {/* Physio notes */}
            {exercise.notes && (
              <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-1">
                  Fysionot
                </p>
                <p className="text-sm text-slate-300">{exercise.notes}</p>
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Pain logging */}
      <GlassCard className={cn(!isGlass && 'bg-card')}>
        <GlassCardHeader>
          <GlassCardTitle className="text-lg font-black tracking-tight">
            Logga smärta
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-6">
          {/* Pain during */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Smärta under övningen</span>
              <span className={cn('text-2xl font-black tabular-nums', getPainColor(painDuring, acceptablePainDuring))}>
                {painDuring}
              </span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[painDuring]}
              onValueChange={([val]) => setPainDuring(val)}
              className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
              <span>Ingen smärta</span>
              <span>Acceptabel: ≤{acceptablePainDuring}</span>
              <span>Extrem smärta</span>
            </div>
            {painDuring > acceptablePainDuring && (
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span>Smärtan överstiger acceptabel nivå. Överväg att minska belastningen.</span>
              </div>
            )}
          </div>

          {/* Pain after */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Smärta efter övningen</span>
              <span className={cn('text-2xl font-black tabular-nums', getPainColor(painAfter, acceptablePainAfter))}>
                {painAfter}
              </span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[painAfter]}
              onValueChange={([val]) => setPainAfter(val)}
              className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
              <span>Ingen smärta</span>
              <span>Acceptabel: ≤{acceptablePainAfter}</span>
              <span>Extrem smärta</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
              Anteckningar (valfritt)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hur kändes övningen? Något att notera..."
              className="bg-white/5 border-white/10 min-h-[80px] rounded-xl text-white"
            />
          </div>

          {/* Complete button */}
          <Button
            onClick={handleComplete}
            disabled={isCompleted}
            className={cn(
              'w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all',
              isCompleted
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Övning slutförd
              </>
            ) : (
              'Slutför övning'
            )}
          </Button>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
