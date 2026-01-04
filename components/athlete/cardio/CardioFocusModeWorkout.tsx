'use client'

/**
 * CardioFocusModeWorkout Component
 *
 * Full-screen cardio workout execution with segment-by-segment progression.
 */


import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Activity,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IntervalTimer } from './IntervalTimer'
import { SegmentLoggingForm } from './SegmentLoggingForm'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface FocusModeSegment {
  id: string
  index: number
  type: SegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  completed: boolean
  skipped: boolean
  logId?: string
}

interface CardioFocusModeWorkoutProps {
  assignmentId: string
  sessionName: string
  sessionDescription?: string
  sport: string
  segments: FocusModeSegment[]
  initialSegmentIndex?: number
  onClose: () => void
  onComplete: (data: { sessionRPE: number; notes?: string }) => void
  onSegmentComplete: (
    segmentIndex: number,
    data: {
      actualDuration?: number
      actualDistance?: number
      actualPace?: number
      actualAvgHR?: number
      actualMaxHR?: number
      completed: boolean
      skipped: boolean
      notes?: string
    }
  ) => Promise<void>
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  WARMUP: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  COOLDOWN: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  INTERVAL: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  STEADY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  RECOVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
  HILL: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  DRILLS: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
}

type ViewState = 'timer' | 'logging' | 'complete'

export function CardioFocusModeWorkout({
  assignmentId,
  sessionName,
  sessionDescription,
  sport,
  segments: initialSegments,
  initialSegmentIndex = 0,
  onClose,
  onComplete,
  onSegmentComplete,
}: CardioFocusModeWorkoutProps) {
  const [segments, setSegments] = useState<FocusModeSegment[]>(initialSegments)
  const [currentIndex, setCurrentIndex] = useState(initialSegmentIndex)
  const [viewState, setViewState] = useState<ViewState>('timer')
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [sessionRPE, setSessionRPE] = useState(5)
  const [sessionNotes, setSessionNotes] = useState('')
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentSegment = segments[currentIndex]
  const completedCount = segments.filter((s) => s.completed || s.skipped).length
  const progressPercent = segments.length > 0 ? (completedCount / segments.length) * 100 : 0

  // Check if all segments are complete
  useEffect(() => {
    if (completedCount === segments.length && segments.length > 0) {
      setShowCompleteDialog(true)
    }
  }, [completedCount, segments.length])

  // Handle timer complete - show logging form
  const handleTimerComplete = useCallback(() => {
    if (currentSegment?.plannedDuration) {
      setTimerElapsed(currentSegment.plannedDuration)
    }
    setViewState('logging')
  }, [currentSegment])

  // Handle timer skip - mark as skipped and move on
  const handleTimerSkip = useCallback(() => {
    setViewState('logging')
  }, [])

  // Handle segment logging submit
  const handleSegmentSubmit = async (data: {
    actualDuration?: number
    actualDistance?: number
    actualPace?: number
    actualAvgHR?: number
    actualMaxHR?: number
    completed: boolean
    skipped: boolean
    notes?: string
  }) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await onSegmentComplete(currentIndex, data)

      // Update local state
      setSegments((prev) =>
        prev.map((seg, idx) =>
          idx === currentIndex
            ? { ...seg, ...data }
            : seg
        )
      )

      // Move to next segment or show complete dialog
      if (currentIndex < segments.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setViewState('timer')
        setTimerElapsed(0)
      } else {
        setShowCompleteDialog(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle segment skip
  const handleSegmentSkip = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await onSegmentComplete(currentIndex, {
        completed: false,
        skipped: true,
      })

      // Update local state
      setSegments((prev) =>
        prev.map((seg, idx) =>
          idx === currentIndex
            ? { ...seg, skipped: true, completed: false }
            : seg
        )
      )

      // Move to next segment
      if (currentIndex < segments.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setViewState('timer')
        setTimerElapsed(0)
      } else {
        setShowCompleteDialog(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle final completion
  const handleFinalComplete = () => {
    onComplete({
      sessionRPE,
      notes: sessionNotes || undefined,
    })
  }

  // Navigate to previous segment
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setViewState('timer')
      setTimerElapsed(0)
    }
  }

  // Navigate to next segment
  const goToNext = () => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setViewState('timer')
      setTimerElapsed(0)
    }
  }

  // Format time
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentSegment) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)} className="hover:bg-slate-100 dark:hover:bg-white/10">
          <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        </Button>
        <div className="text-center">
          <h1 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">{sessionName}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Segment {currentIndex + 1} av {segments.length}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
        <div className="flex items-center gap-4">
          <Progress value={progressPercent} className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-white/10" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            {completedCount}/{segments.length}
          </span>
        </div>
        {/* Segment type indicators */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 custom-scrollbar">
          {segments.map((seg, idx) => (
            <div
              key={seg.id}
              className={cn(
                'h-2 rounded-full flex-shrink-0 transition-all duration-300',
                idx < segments.length / 2 ? 'w-4' : 'w-3',
                seg.completed || seg.skipped
                  ? 'bg-emerald-500'
                  : idx === currentIndex
                    ? SEGMENT_COLORS[seg.type].split(' ')[0] // extract just the bg color logic if possible, or mapping
                    : 'bg-slate-200 dark:bg-white/10'
              )}
              style={idx === currentIndex ? {} : {}}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4">
        {viewState === 'timer' && currentSegment.plannedDuration ? (
          <IntervalTimer
            duration={currentSegment.plannedDuration}
            segmentType={currentSegment.type}
            segmentNumber={currentIndex + 1}
            totalSegments={segments.length}
            targetPace={currentSegment.plannedPace}
            targetZone={currentSegment.plannedZone}
            targetDistance={currentSegment.plannedDistance}
            notes={currentSegment.notes}
            onComplete={handleTimerComplete}
            onSkip={handleTimerSkip}
            autoStart={false}
          />
        ) : viewState === 'timer' && !currentSegment.plannedDuration ? (
          // No duration - show segment info and allow marking complete
          <div className="text-center space-y-8 max-w-sm mx-auto">
            <Badge className={cn('text-lg py-2 px-6 font-black uppercase tracking-wider', SEGMENT_COLORS[currentSegment.type])}>
              {currentSegment.typeName}
            </Badge>
            {currentSegment.plannedDistance && (
              <div className="space-y-1">
                <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {currentSegment.plannedDistance.toFixed(2)}
                </p>
                <p className="text-xl font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">km</p>
              </div>
            )}
            {currentSegment.notes && (
              <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{currentSegment.notes}</p>
              </div>
            )}
            <Button size="lg" onClick={handleTimerComplete} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Markera som slutförd
            </Button>
          </div>
        ) : (
          <SegmentLoggingForm
            segmentIndex={currentIndex}
            segmentType={currentSegment.type}
            typeName={currentSegment.typeName}
            plannedDuration={currentSegment.plannedDuration}
            plannedDistance={currentSegment.plannedDistance}
            plannedPace={currentSegment.plannedPace}
            plannedZone={currentSegment.plannedZone}
            timerDuration={timerElapsed}
            onSubmit={handleSegmentSubmit}
            onSkip={handleSegmentSkip}
          />
        )}
      </div>

      {/* Footer navigation */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Clock className="h-4 w-4" />
          <span>
            {segments
              .slice(currentIndex)
              .reduce((sum, s) => sum + (s.plannedDuration || 0), 0) > 0
              ? formatDuration(
                segments
                  .slice(currentIndex)
                  .reduce((sum, s) => sum + (s.plannedDuration || 0), 0)
              )
              : '-'
            } kvar
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex >= segments.length - 1}
          className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Du har slutfört {completedCount} av {segments.length} segment.
              Din framsteg sparas och du kan fortsätta senare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt träna</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>
              Avsluta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Pass slutfört!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bra jobbat! Du har slutfört alla {segments.length} segment.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* RPE Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Hur tungt kändes passet? (RPE)
                </Label>
                <Badge variant="outline" className="text-lg px-3">
                  {sessionRPE}
                </Badge>
              </div>
              <Slider
                value={[sessionRPE]}
                onValueChange={([value]) => setSessionRPE(value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lätt</span>
                <span>Måttligt</span>
                <span>Hårt</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinalComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Slutför pass
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CardioFocusModeWorkout
