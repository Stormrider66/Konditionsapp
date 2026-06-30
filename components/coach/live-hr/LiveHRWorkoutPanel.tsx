'use client'

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Flag, ListChecks, Play, Save, Square, TimerReset, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { useLocale } from '@/i18n/client'
import { buildLiveHRTargetGuidance, type LiveHRTargetMetric, type LiveHRTargetStatus } from '@/lib/live-hr/target-guidance'
import type {
  LiveHRParticipantData,
  LiveHRWorkflowAssignment,
  LiveHRWorkflowBlock,
  LiveHRWorkflowBlockType,
  LiveHRWorkflowState,
  LiveHRWorkoutOption,
} from '@/lib/live-hr/types'
import { cn } from '@/lib/utils'

type AppLocale = 'en' | 'sv'

interface LiveHRWorkoutPanelProps {
  sessionId: string
  participants: LiveHRParticipantData[]
  workflow: LiveHRWorkflowState
  setWorkflow: Dispatch<SetStateAction<LiveHRWorkflowState>>
  onWorkflowSaved?: () => void
  disabled?: boolean
  basePath?: string
  nowMs?: number
}

const COPY: Record<AppLocale, {
  title: string
  manual: string
  planned: string
  allAthletes: string
  blockLabel: string
  interval: string
  rest: string
  lap: string
  warmup: string
  cooldown: string
  start: string
  end: string
  nextInterval: string
  workout: string
  assign: string
  remove: string
  previous: string
  next: string
  save: string
  loading: string
  noWorkouts: string
  active: string
  noActive: string
  target: string
  saved: string
  saveError: string
  assignError: string
  activeSaveHint: string
  tagCount: (count: number) => string
  startTarget: string
  finishNext: string
  guidance: string
  remaining: string
  overtime: string
  status: Record<LiveHRTargetStatus, string>
  metric: Record<LiveHRTargetMetric['key'], string>
}> = {
  en: {
    title: 'Workout control',
    manual: 'Tags',
    planned: 'Planned',
    allAthletes: 'All athletes',
    blockLabel: 'Label',
    interval: 'Interval',
    rest: 'Rest',
    lap: 'Lap',
    warmup: 'Warmup',
    cooldown: 'Cooldown',
    start: 'Start',
    end: 'End',
    nextInterval: 'Lap + next',
    workout: 'Workout',
    assign: 'Assign',
    remove: 'Remove',
    previous: 'Previous',
    next: 'Next',
    save: 'Save interval session',
    loading: 'Loading...',
    noWorkouts: 'No workouts',
    active: 'Active',
    noActive: 'No active tag',
    target: 'Target',
    saved: 'Interval session saved',
    saveError: 'Could not save interval session',
    assignError: 'Choose athlete and workout',
    activeSaveHint: 'Active tags are saved with the current time.',
    tagCount: (count) => count === 1 ? '1 tag' : `${count} tags`,
    startTarget: 'Start target',
    finishNext: 'Finish + next',
    guidance: 'Guidance',
    remaining: 'left',
    overtime: 'over',
    status: {
      waiting: 'Waiting',
      on: 'OK',
      low: 'Low',
      high: 'High',
    },
    metric: {
      power: 'W',
      cadence: 'RPM',
      zone: 'Zone',
      heartRate: 'HR',
    },
  },
  sv: {
    title: 'Passkontroll',
    manual: 'Taggar',
    planned: 'Planerat',
    allAthletes: 'Alla atleter',
    blockLabel: 'Etikett',
    interval: 'Intervall',
    rest: 'Vila',
    lap: 'Varv',
    warmup: 'Uppvärmning',
    cooldown: 'Nedvarvning',
    start: 'Starta',
    end: 'Avsluta',
    nextInterval: 'Varv + nästa',
    workout: 'Pass',
    assign: 'Tilldela',
    remove: 'Ta bort',
    previous: 'Föregående',
    next: 'Nästa',
    save: 'Spara intervallsession',
    loading: 'Laddar...',
    noWorkouts: 'Inga pass',
    active: 'Aktiv',
    noActive: 'Ingen aktiv tagg',
    target: 'Mål',
    saved: 'Intervallsession sparad',
    saveError: 'Kunde inte spara intervallsessionen',
    assignError: 'Välj atlet och pass',
    activeSaveHint: 'Aktiva taggar sparas med aktuell tid.',
    tagCount: (count) => count === 1 ? '1 tagg' : `${count} taggar`,
    startTarget: 'Starta mål',
    finishNext: 'Klar + nästa',
    guidance: 'Styrning',
    remaining: 'kvar',
    overtime: 'över',
    status: {
      waiting: 'Väntar',
      on: 'OK',
      low: 'Låg',
      high: 'Hög',
    },
    metric: {
      power: 'W',
      cadence: 'RPM',
      zone: 'Zon',
      heartRate: 'Puls',
    },
  },
}

const BLOCK_TYPES: LiveHRWorkflowBlockType[] = ['INTERVAL', 'REST', 'LAP', 'WARMUP', 'COOLDOWN']

function blockTypeLabel(type: LiveHRWorkflowBlockType, copy: typeof COPY[AppLocale]) {
  if (type === 'REST') return copy.rest
  if (type === 'LAP') return copy.lap
  if (type === 'WARMUP') return copy.warmup
  if (type === 'COOLDOWN') return copy.cooldown
  return copy.interval
}

function formatDuration(seconds?: number) {
  if (!seconds) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`
}

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatDistance(meters?: number) {
  if (!meters) return null
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km` : `${meters} m`
}

function formatTarget(step?: LiveHRWorkflowAssignment['steps'][number] | null) {
  if (!step) return '-'
  const parts = [
    formatDuration(step.durationSeconds),
    step.targetPower ? `${step.targetPower} W` : null,
    step.targetCadence ? `${step.targetCadence} rpm` : null,
    step.targetZone ? `Z${step.targetZone}` : null,
    step.targetHeartRate ?? null,
    step.targetCalories ? `${step.targetCalories} cal` : null,
    formatDistance(step.targetDistanceMeters),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : step.notes ?? '-'
}

function activeBlockForScope(blocks: LiveHRWorkflowBlock[], clientId: string | null) {
  return [...blocks]
    .reverse()
    .find((block) => !block.endedAt && block.clientId === clientId) ?? null
}

function freshBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function guidanceClass(status: LiveHRTargetStatus) {
  if (status === 'on') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300'
  if (status === 'low') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300'
  if (status === 'high') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300'
  return 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400'
}

export function LiveHRWorkoutPanel({
  sessionId,
  participants,
  workflow,
  setWorkflow,
  onWorkflowSaved,
  disabled = false,
  basePath = '',
  nowMs,
}: LiveHRWorkoutPanelProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const router = useRouter()
  const [scopeClientId, setScopeClientId] = useState<string>('ALL')
  const [blockType, setBlockType] = useState<LiveHRWorkflowBlockType>('INTERVAL')
  const [blockLabel, setBlockLabel] = useState('')
  const [assignmentClientId, setAssignmentClientId] = useState(participants[0]?.clientId ?? '')
  const [workoutOptions, setWorkoutOptions] = useState<LiveHRWorkoutOption[]>([])
  const [selectedWorkoutKey, setSelectedWorkoutKey] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedScope = scopeClientId === 'ALL' ? null : scopeClientId
  const activeBlock = activeBlockForScope(workflow.blocks, selectedScope)
  const selectedAssignment = assignmentClientId ? workflow.assignments[assignmentClientId] : undefined
  const currentStep = selectedAssignment?.steps[selectedAssignment.currentStepIndex] ?? null
  const selectedWorkout = workoutOptions.find((option) => option.id === selectedWorkoutKey)
  const selectedParticipant = participants.find((participant) => participant.clientId === assignmentClientId)
  const selectedActiveBlock = assignmentClientId ? activeBlockForScope(workflow.blocks, assignmentClientId) : null
  const selectedGuidance = selectedParticipant
    ? buildLiveHRTargetGuidance({ participant: selectedParticipant, step: currentStep, activeBlock: selectedActiveBlock, nowMs })
    : null
  const hasBlocks = workflow.blocks.length > 0
  const activeBlockCount = workflow.blocks.filter((block) => !block.endedAt).length

  useEffect(() => {
    if (!participants.some((participant) => participant.clientId === assignmentClientId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssignmentClientId(participants[0]?.clientId ?? '')
    }
    if (scopeClientId !== 'ALL' && !participants.some((participant) => participant.clientId === scopeClientId)) {
      setScopeClientId('ALL')
    }
  }, [assignmentClientId, participants, scopeClientId])

  useEffect(() => {
    if (!assignmentClientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkoutOptions([])
      return
    }

    let cancelled = false
    setLoadingOptions(true)
    fetch(`/api/coach/live-hr/workout-options?clientId=${encodeURIComponent(assignmentClientId)}`, {
      credentials: 'same-origin',
    })
      .then((res) => res.ok ? res.json() as Promise<{ options: LiveHRWorkoutOption[] }> : { options: [] })
      .then((payload) => {
        if (cancelled) return
        setWorkoutOptions(payload.options)
        setSelectedWorkoutKey((current) => payload.options.some((option) => option.id === current) ? current : payload.options[0]?.id ?? '')
      })
      .catch(() => {
        if (!cancelled) setWorkoutOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })

    return () => {
      cancelled = true
    }
  }, [assignmentClientId])

  const selectedParticipantName = useMemo(
    () => participants.find((participant) => participant.clientId === scopeClientId)?.clientName ?? copy.allAthletes,
    [copy.allAthletes, participants, scopeClientId]
  )

  const closeActiveForScope = (blocks: LiveHRWorkflowBlock[], clientId: string | null, endedAt: string) =>
    blocks.map((block) => (!block.endedAt && block.clientId === clientId ? { ...block, endedAt } : block))

  const startBlock = (type: LiveHRWorkflowBlockType, forceLabel?: string) => {
    if (disabled) return
    const now = new Date().toISOString()
    const assignment = selectedScope ? workflow.assignments[selectedScope] : undefined
    const target = assignment?.steps[assignment.currentStepIndex] ?? null
    const label = forceLabel || blockLabel.trim() || target?.label || blockTypeLabel(type, copy)

    setWorkflow((current) => {
      const closed = closeActiveForScope(current.blocks, selectedScope, now)
      return {
        ...current,
        blocks: [
          ...closed,
          {
            id: freshBlockId(),
            clientId: selectedScope,
            type,
            label,
            sequence: closed.length,
            startedAt: now,
            endedAt: null,
            stepIndex: target?.index ?? null,
            target,
          },
        ],
      }
    })
    setBlockLabel('')
  }

  const endBlock = () => {
    const now = new Date().toISOString()
    setWorkflow((current) => ({
      ...current,
      blocks: closeActiveForScope(current.blocks, selectedScope, now),
    }))
  }

  const lapAndNext = () => {
    const label = blockLabel.trim() || currentStep?.label || copy.nextInterval
    startBlock('INTERVAL', label)
  }

  const assignWorkout = () => {
    if (!assignmentClientId || !selectedWorkout) {
      toast.error(copy.assignError)
      return
    }

    setWorkflow((current) => ({
      ...current,
      assignments: {
        ...current.assignments,
        [assignmentClientId]: {
          clientId: assignmentClientId,
          workoutType: selectedWorkout.workoutType,
          workoutId: selectedWorkout.workoutId,
          workoutName: selectedWorkout.workoutName,
          sourceAssignmentId: selectedWorkout.sourceAssignmentId,
          steps: selectedWorkout.steps,
          currentStepIndex: 0,
          assignedAt: new Date().toISOString(),
        },
      },
    }))
  }

  const removeAssignment = () => {
    if (!assignmentClientId) return
    setWorkflow((current) => {
      const nextAssignments = { ...current.assignments }
      delete nextAssignments[assignmentClientId]
      return { ...current, assignments: nextAssignments }
    })
  }

  const moveTarget = (delta: number) => {
    if (!assignmentClientId) return
    setWorkflow((current) => {
      const assignment = current.assignments[assignmentClientId]
      if (!assignment) return current
      const nextIndex = Math.max(0, Math.min(assignment.steps.length - 1, assignment.currentStepIndex + delta))
      return {
        ...current,
        assignments: {
          ...current.assignments,
          [assignmentClientId]: { ...assignment, currentStepIndex: nextIndex },
        },
      }
    })
  }

  const startPlannedTarget = () => {
    if (disabled || !assignmentClientId) return
    const now = new Date().toISOString()

    setWorkflow((current) => {
      const assignment = current.assignments[assignmentClientId]
      const target = assignment?.steps[assignment.currentStepIndex]
      if (!assignment || !target) return current
      const closed = closeActiveForScope(current.blocks, assignmentClientId, now)

      return {
        ...current,
        blocks: [
          ...closed,
          {
            id: freshBlockId(),
            clientId: assignmentClientId,
            type: target.type,
            label: target.label,
            sequence: closed.length,
            startedAt: now,
            endedAt: null,
            stepIndex: target.index,
            target,
          },
        ],
      }
    })
  }

  const finishPlannedTarget = () => {
    if (!assignmentClientId) return
    const now = new Date().toISOString()

    setWorkflow((current) => {
      const assignment = current.assignments[assignmentClientId]
      if (!assignment) return current
      const nextIndex = Math.min(assignment.steps.length - 1, assignment.currentStepIndex + 1)
      return {
        ...current,
        blocks: closeActiveForScope(current.blocks, assignmentClientId, now),
        assignments: {
          ...current.assignments,
          [assignmentClientId]: { ...assignment, currentStepIndex: nextIndex },
        },
      }
    })
  }

  const saveIntervalSession = async () => {
    if (!hasBlocks || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/live-hr/sessions/${sessionId}/export-interval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(workflow),
      })
      const payload = await res.json() as { intervalSessionId?: string; error?: string }
      if (!res.ok || !payload.intervalSessionId) throw new Error(payload.error || copy.saveError)
      toast.success(copy.saved)
      onWorkflowSaved?.()
      router.push(`${basePath}/coach/interval-sessions/${payload.intervalSessionId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <RolePanel className="mb-6">
      <div className="border-b border-zinc-200 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            <ListChecks className="h-4 w-4 text-blue-500" />
            {copy.title}
            {hasBlocks && (
              <Badge variant="outline" className="ml-1 font-normal">
                {copy.tagCount(workflow.blocks.length)}
              </Badge>
            )}
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {activeBlockCount > 0 && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {copy.activeSaveHint}
              </span>
            )}
            <Button type="button" size="sm" onClick={() => void saveIntervalSession()} disabled={!hasBlocks || saving}>
              <Save className="h-4 w-4 mr-2" />
              {copy.save}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Flag className="h-4 w-4 text-amber-500" />
            {copy.manual}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <Select value={scopeClientId} onValueChange={setScopeClientId} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{copy.allAthletes}</SelectItem>
                {participants.map((participant) => (
                  <SelectItem key={participant.clientId} value={participant.clientId}>
                    {participant.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={blockType} onValueChange={(value) => setBlockType(value as LiveHRWorkflowBlockType)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {blockTypeLabel(type, copy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input
              value={blockLabel}
              onChange={(event) => setBlockLabel(event.target.value)}
              placeholder={copy.blockLabel}
              disabled={disabled}
            />
            <Button type="button" onClick={() => startBlock(blockType)} disabled={disabled}>
              <Play className="h-4 w-4 mr-2" />
              {copy.start}
            </Button>
            <Button type="button" variant="outline" onClick={lapAndNext} disabled={disabled}>
              <TimerReset className="h-4 w-4 mr-2" />
              {copy.nextInterval}
            </Button>
            <Button type="button" variant="outline" onClick={endBlock} disabled={disabled || !activeBlock}>
              <Square className="h-4 w-4 mr-2" />
              {copy.end}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Badge variant={activeBlock ? 'default' : 'outline'} className={cn(activeBlock && 'bg-emerald-600 text-white border-none')}>
              {activeBlock ? copy.active : copy.noActive}
            </Badge>
            <span className="font-medium">{selectedParticipantName}</span>
            {activeBlock && (
              <>
                <span>{blockTypeLabel(activeBlock.type, copy)}</span>
                <span className="font-medium text-slate-900 dark:text-white">{activeBlock.label}</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <TimerReset className="h-4 w-4 text-blue-500" />
            {copy.planned}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <Select value={assignmentClientId} onValueChange={setAssignmentClientId} disabled={participants.length === 0}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.clientId} value={participant.clientId}>
                    {participant.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWorkoutKey} onValueChange={setSelectedWorkoutKey} disabled={!assignmentClientId || loadingOptions || workoutOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? copy.loading : copy.workout} />
              </SelectTrigger>
              <SelectContent>
                {workoutOptions.length === 0 ? (
                  <SelectItem value="none" disabled>{copy.noWorkouts}</SelectItem>
                ) : workoutOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.workoutName} · {option.steps.length}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={assignWorkout} disabled={!assignmentClientId || !selectedWorkout}>
              {copy.assign}
            </Button>
            <Button type="button" onClick={startPlannedTarget} disabled={disabled || !selectedAssignment || !currentStep}>
              <Play className="h-4 w-4 mr-2" />
              {copy.startTarget}
            </Button>
            <Button type="button" variant="outline" onClick={finishPlannedTarget} disabled={!selectedAssignment}>
              <Square className="h-4 w-4 mr-2" />
              {copy.finishNext}
            </Button>
            <Button type="button" variant="outline" onClick={() => moveTarget(-1)} disabled={!selectedAssignment || selectedAssignment.currentStepIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {copy.previous}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => moveTarget(1)}
              disabled={!selectedAssignment || selectedAssignment.currentStepIndex >= selectedAssignment.steps.length - 1}
            >
              {copy.next}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button type="button" variant="ghost" onClick={removeAssignment} disabled={!selectedAssignment}>
              <X className="h-4 w-4 mr-2" />
              {copy.remove}
            </Button>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
            {selectedAssignment ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedAssignment.currentStepIndex + 1}/{selectedAssignment.steps.length}</Badge>
                  <span className="font-semibold text-slate-900 dark:text-white">{currentStep?.label ?? selectedAssignment.workoutName}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {copy.target}: {formatTarget(currentStep)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">{selectedAssignment.workoutName}</div>
                {selectedGuidance && (selectedGuidance.timer || selectedGuidance.metrics.length > 0) && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {copy.guidance}
                    </div>
                    {selectedGuidance.timer && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            {selectedGuidance.timer.isOvertime
                              ? `${formatClock(selectedGuidance.timer.elapsedSeconds - selectedGuidance.timer.durationSeconds)} ${copy.overtime}`
                              : `${formatClock(selectedGuidance.timer.remainingSeconds)} ${copy.remaining}`}
                          </span>
                          <span>{Math.round(selectedGuidance.timer.progress * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                          <div
                            className={cn('h-full rounded-full', selectedGuidance.timer.isOvertime ? 'bg-amber-500' : 'bg-blue-500')}
                            style={{ width: `${Math.min(100, Math.round(selectedGuidance.timer.progress * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedGuidance.metrics.length > 0 && (
                      <div className="grid gap-1">
                        {selectedGuidance.metrics.map((metric) => (
                          <div
                            key={metric.key}
                            className={cn('flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs', guidanceClass(metric.status))}
                          >
                            <span className="font-semibold">{copy.metric[metric.key]}</span>
                            <span className="tabular-nums">
                              {metric.actualLabel} / {metric.targetLabel}
                              {metric.deltaLabel ? ` (${metric.deltaLabel})` : ''}
                            </span>
                            <span className="font-semibold">{copy.status[metric.status]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">{copy.workout}</span>
            )}
          </div>
        </div>
      </div>
    </RolePanel>
  )
}
