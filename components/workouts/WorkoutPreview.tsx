'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'
import type {
  PreviewExercise,
  PreviewWorkoutData,
  WorkoutKind,
  WorkoutSection,
} from './types'

const SECTION_CONFIG: Record<
  WorkoutSection,
  { labelKey: 'warmup' | 'main' | 'prehab' | 'core' | 'recovery' | 'cooldown'; icon: typeof Flame; accent: string }
> = {
  WARMUP: { labelKey: 'warmup', icon: Flame, accent: 'text-amber-500' },
  MAIN: { labelKey: 'main', icon: Dumbbell, accent: 'text-primary' },
  PREHAB: { labelKey: 'prehab', icon: ShieldCheck, accent: 'text-teal-500' },
  CORE: { labelKey: 'core', icon: Target, accent: 'text-purple-500' },
  COOLDOWN: { labelKey: 'cooldown', icon: Timer, accent: 'text-emerald-500' },
}

const KIND_LABEL: Record<
  WorkoutKind,
  'strength' | 'cardio' | 'hybrid' | 'agility'
> = {
  strength: 'strength',
  cardio: 'cardio',
  hybrid: 'hybrid',
  agility: 'agility',
}

const INTENSITY_LABEL: Record<
  NonNullable<PreviewWorkoutData['workout']['intensity']>,
  'low' | 'moderate' | 'high' | 'max'
> = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  MAX: 'max',
}

export interface WorkoutPreviewProps {
  data: PreviewWorkoutData
  /** Called when the athlete clicks a specific exercise row. Opens the log sheet. */
  onExerciseClick?: (exercise: PreviewExercise) => void
  /** Called when the athlete taps "Starta Pass". */
  onStart?: () => void
  /** Called when the athlete taps "Avsluta Pass". */
  onComplete?: () => void
  /** Only set on the AI generation flow — renders "Generera nytt". */
  onRegenerate?: () => void
  /** Close the preview (X button in header). */
  onClose?: () => void
  /** Replaces the default footer if provided. Use for coach-side variants. */
  footer?: ReactNode
  /** Slot above the collapsible segments (e.g. coach attach controls). */
  heroSlot?: ReactNode
  /** Toggle audio AI — renders the provided control on the right of the header. */
  audioSlot?: ReactNode
  /** Disable section auto-expansion on mount. */
  defaultCollapsed?: boolean
  /** Override which sections open initially. */
  defaultExpandedSections?: WorkoutSection[] | 'all'
}

export function WorkoutPreview({
  data,
  onExerciseClick,
  onStart,
  onComplete,
  onRegenerate,
  onClose,
  footer,
  heroSlot,
  audioSlot,
  defaultCollapsed = false,
  defaultExpandedSections,
}: WorkoutPreviewProps) {
  const t = useTranslations('components.workoutPreview')
  const { workout, sections, exercises, progress, readiness, assignment } = data

  const firstSection = sections[0]?.type
  const [expanded, setExpanded] = useState<Set<WorkoutSection>>(
    () => {
      if (defaultCollapsed || !firstSection) return new Set()
      if (defaultExpandedSections === 'all') {
        return new Set(sections.map((section) => section.type))
      }
      if (Array.isArray(defaultExpandedSections)) {
        return new Set(defaultExpandedSections)
      }
      return new Set([firstSection, ...(sections[1] ? [sections[1].type] : [])])
    },
  )

  const exercisesBySection = useMemo(() => {
    const map = new Map<WorkoutSection, PreviewExercise[]>()
    for (const ex of exercises) {
      const list = map.get(ex.section) ?? []
      list.push(ex)
      map.set(ex.section, list)
    }
    return map
  }, [exercises])

  const toggleSection = (s: WorkoutSection) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const kindLabel = t(`kinds.${workout.kind ? KIND_LABEL[workout.kind] : KIND_LABEL.strength}`)
  const intensityLabel = workout.intensity ? t(`intensity.${INTENSITY_LABEL[workout.intensity]}`) : null
  const resumeLabel = progress.completedSets > 0 ? t('actions.continue') : t('actions.start')

  const heroImage =
    exercises.find((e) => e.section === 'MAIN' && e.imageUrls?.[0])?.imageUrls?.[0] ??
    exercises.find((e) => e.imageUrls?.[0])?.imageUrls?.[0]

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-background text-foreground">
      <Header
        workoutName={workout.name}
        kindLabel={kindLabel}
        tags={workout.tags}
        isAiGenerated={workout.isAiGenerated}
        estimatedDuration={workout.estimatedDuration ?? null}
        totalExercises={progress.totalExercises}
        intensityLabel={intensityLabel}
        onClose={onClose}
        audioSlot={audioSlot}
        heroImage={heroImage}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-36 sm:pb-32">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-5 sm:px-6">
          <ReadinessBanner readiness={readiness} />

          {workout.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {workout.description}
            </p>
          )}

          {assignment.notes && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                {t('labels.coachNote')}
              </p>
              <p className="text-foreground/90">{assignment.notes}</p>
            </div>
          )}

          {progress.completedSets > 0 && !progress.isComplete && (
            <ProgressRow
              completedSets={progress.completedSets}
              totalSetsTarget={progress.totalSetsTarget}
              percentComplete={progress.percentComplete}
            />
          )}

          {heroSlot}

          <div className="space-y-2.5">
            {sections.map((section) => {
              const cfg = SECTION_CONFIG[section.type]
              const Icon = cfg.icon
              const items = exercisesBySection.get(section.type) ?? []
              const isOpen = expanded.has(section.type)
              return (
                <Collapsible
                  key={section.type}
                  open={isOpen}
                  onOpenChange={() => toggleSection(section.type)}
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className={cn('h-4 w-4', cfg.accent)} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t(`sections.${cfg.labelKey}`)}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('stats.exerciseCount', { count: section.exerciseCount })}
                              {section.duration ? ` · ${section.duration} min` : ''}
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/60 bg-background/60 px-2 py-2">
                        {section.notes && (
                          <p className="mb-1 px-2 text-xs italic text-muted-foreground">
                            {section.notes}
                          </p>
                        )}
                        <ul className="space-y-1">
                          {items.map((ex, idx) => (
                            <ExerciseRow
                              key={ex.id}
                              index={idx + 1}
                              exercise={ex}
                              onClick={onExerciseClick ? () => onExerciseClick(ex) : undefined}
                            />
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </div>
      </div>

      {footer ?? (
        <DefaultFooter
          startLabel={resumeLabel}
          onStart={onStart}
          onComplete={onComplete}
          onRegenerate={onRegenerate}
          allDone={progress.isComplete}
        />
      )}
    </div>
  )
}

function Header({
  workoutName,
  kindLabel,
  tags,
  isAiGenerated,
  estimatedDuration,
  totalExercises,
  intensityLabel,
  onClose,
  audioSlot,
  heroImage,
}: {
  workoutName: string
  kindLabel: string
  tags?: string[]
  isAiGenerated?: boolean
  estimatedDuration: number | null
  totalExercises: number
  intensityLabel: string | null
  onClose?: () => void
  audioSlot?: ReactNode
  heroImage?: string
}) {
  const t = useTranslations('components.workoutPreview')
  return (
    <header className="relative sticky top-0 z-10 overflow-hidden border-b border-border/60 bg-background/95 backdrop-blur">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20 blur-md"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background/95" />
        <Dumbbell
          className="absolute -right-4 -top-6 h-40 w-40 text-primary/10"
          strokeWidth={1}
        />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {isAiGenerated && (
                <Badge className="gap-1 bg-primary/15 text-primary border-primary/20" variant="outline">
                  <Sparkles className="h-3 w-3" />
                  {t('tags.aiGenerated')}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Dumbbell className="h-3 w-3" />
                {kindLabel}
              </Badge>
              {tags?.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {workoutName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {estimatedDuration != null && (
                <Chip icon={<Clock className="h-3.5 w-3.5" />}>
                  {estimatedDuration} {t('labels.minutes')}
                </Chip>
              )}
              <Chip icon={<Dumbbell className="h-3.5 w-3.5" />}>
                {t('stats.exerciseCount', { count: totalExercises })}
              </Chip>
              {intensityLabel && (
                <Chip icon={<Flame className="h-3.5 w-3.5" />}>{intensityLabel}</Chip>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {audioSlot}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('actions.close')}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5">
      {icon}
      {children}
    </span>
  )
}

function ReadinessBanner({ readiness }: { readiness?: PreviewWorkoutData['readiness'] }) {
  const t = useTranslations('components.workoutPreview')
  if (!readiness) return null
  if (!readiness.available) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
        <Heart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">{t('readiness.unavailable')}</p>
          {readiness.message && (
            <p className="mt-0.5 text-xs text-muted-foreground">{readiness.message}</p>
          )}
        </div>
      </div>
    )
  }
  const tone =
    readiness.score != null && readiness.score < 50
      ? 'border-amber-400/40 bg-amber-500/10'
      : 'border-emerald-400/40 bg-emerald-500/10'
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', tone)}>
      <Heart className="h-4 w-4" />
      <span>
        {t('readiness.label', { score: readiness.score ?? '-' })}
        {readiness.message ? ` — ${readiness.message}` : ''}
      </span>
    </div>
  )
}

function ProgressRow({
  completedSets,
  totalSetsTarget,
  percentComplete,
}: {
  completedSets: number
  totalSetsTarget: number
  percentComplete: number
}) {
  const t = useTranslations('components.workoutPreview')
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t('progress.activeWorkout')}</span>
        <span className="font-medium">
          {t('progress.setProgress', {
            completed: completedSets,
            total: totalSetsTarget,
            percent: percentComplete,
          })}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentComplete}%` }}
        />
      </div>
    </div>
  )
}

function ExerciseRow({
  index,
  exercise,
  onClick,
}: {
  index: number
  exercise: PreviewExercise
  onClick?: () => void
}) {
  const t = useTranslations('components.workoutPreview')
  const done = exercise.completedSets >= exercise.sets
  const inProgress = exercise.completedSets > 0 && !done
  const content = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/50',
        done && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          done
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : inProgress
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : index}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            done && 'line-through decoration-muted-foreground/40',
          )}
        >
          {exercise.nameSv || exercise.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {exercise.sets}×{exercise.repsTarget}
          {exercise.weight ? ` · ${exercise.weight} kg` : ''}
          {exercise.restSeconds
            ? ` · ${t('labels.rest', { value: formatRest(exercise.restSeconds) })}`
            : ''}
        </p>
      </div>
      {inProgress && (
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          {exercise.completedSets}/{exercise.sets}
        </span>
      )}
    </div>
  )
  if (!onClick) return <li>{content}</li>
  return (
    <li>
      <button type="button" onClick={onClick} className="block w-full">
        {content}
      </button>
    </li>
  )
}

function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function DefaultFooter({
  startLabel,
  onStart,
  onComplete,
  onRegenerate,
  allDone,
}: {
  startLabel: string
  onStart?: () => void
  onComplete?: () => void
  onRegenerate?: () => void
  allDone: boolean
}) {
  const t = useTranslations('components.workoutPreview')
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button variant="outline" className="h-12 flex-1 sm:flex-none" onClick={onRegenerate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('actions.regenerate')}
            </Button>
          )}
          {onStart && !allDone && (
            <Button className="h-12 flex-1" onClick={onStart}>
              <Play className="mr-2 h-5 w-5" />
              {startLabel}
            </Button>
          )}
          {onComplete && (
            <Button
              variant={allDone ? 'default' : 'secondary'}
              className="h-12 flex-1"
              onClick={onComplete}
            >
              {allDone ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('actions.complete')}
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t('actions.finish')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkoutPreview
