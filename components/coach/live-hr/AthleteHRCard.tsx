'use client'

import {
  LiveHRParticipantData,
  LiveHRWorkflowAssignment,
  LiveHRWorkflowBlock,
  ZONE_COLORS,
  ZONE_NAMES_EN,
  ZONE_NAMES_SV,
} from '@/lib/live-hr/types'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Heart, AlertCircle, Bike, Flag, Target, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import { buildLiveHRTargetGuidance, type LiveHRTargetMetric, type LiveHRTargetStatus } from '@/lib/live-hr/target-guidance'

interface AthleteHRCardProps {
  participant: LiveHRParticipantData
  assignment?: LiveHRWorkflowAssignment
  activeBlock?: LiveHRWorkflowBlock | null
  nowMs?: number
  onRemove?: (clientId: string) => void
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  unknown: string
  remove: string
  waitingForData: string
  noSignal: string
  waiting: string
  zone: string
  target: string
  remaining: string
  overtime: string
  status: Record<LiveHRTargetStatus, string>
  metric: Record<LiveHRTargetMetric['key'], string>
}> = {
  en: {
    unknown: 'Unknown',
    remove: 'Remove',
    waitingForData: 'Waiting for data...',
    noSignal: 'No signal',
    waiting: 'Waiting...',
    zone: 'Zone',
    target: 'Target',
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
    unknown: 'Okänd',
    remove: 'Ta bort',
    waitingForData: 'Väntar på data...',
    noSignal: 'Ingen signal',
    waiting: 'Väntar...',
    zone: 'Zon',
    target: 'Mål',
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

function formatDuration(seconds?: number) {
  if (!seconds) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`
}

function formatDistance(meters?: number) {
  if (!meters) return null
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km` : `${meters} m`
}

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatTarget(step?: LiveHRWorkflowAssignment['steps'][number] | null) {
  if (!step) return null
  return [
    formatDuration(step.durationSeconds),
    step.targetPower ? `${step.targetPower} W` : null,
    step.targetCadence ? `${step.targetCadence} rpm` : null,
    step.targetZone ? `Z${step.targetZone}` : null,
    step.targetHeartRate ?? null,
    step.targetCalories ? `${step.targetCalories} cal` : null,
    formatDistance(step.targetDistanceMeters),
  ].filter(Boolean).join(' · ')
}

function guidanceClass(status: LiveHRTargetStatus) {
  if (status === 'on') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300'
  if (status === 'low') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300'
  if (status === 'high') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300'
  return 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400'
}

export function AthleteHRCard({ participant, assignment, activeBlock, nowMs, onRemove }: AthleteHRCardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const { clientName, heartRate, zone, isStale, power, cadence, powerZone, machineType } = participant

  const zoneNames = locale === 'sv' ? ZONE_NAMES_SV : ZONE_NAMES_EN
  const zoneColor = zone ? ZONE_COLORS[zone as keyof typeof ZONE_COLORS] : '#6B7280'
  const zoneName = zone ? zoneNames[zone as keyof typeof zoneNames] : copy.unknown
  const powerColor = powerZone ? ZONE_COLORS[powerZone as keyof typeof ZONE_COLORS] : '#6B7280'
  const machineLabel = machineType === 'CONCEPT2_ROW'
    ? 'Concept2 RowErg'
    : machineType === 'CONCEPT2_SKIERG'
      ? 'Concept2 SkiErg'
      : machineType === 'CONCEPT2_BIKEERG'
        ? 'Concept2 BikeErg'
        : machineType === 'WATTBIKE'
          ? 'Wattbike'
          : null
  const cadenceUnit = machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG' ? 'spm' : 'rpm'
  const currentStep = assignment?.steps[assignment.currentStepIndex] ?? null
  const targetText = formatTarget(currentStep)
  const guidance = buildLiveHRTargetGuidance({ participant, step: currentStep, activeBlock, nowMs })

  const hasData = heartRate != null || power != null
  // Accent off HR when present, otherwise off power — so power-only riders light up too.
  const accentColor = heartRate != null ? zoneColor : power != null ? powerColor : '#6B7280'

  return (
    <RolePanel
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isStale && 'opacity-60',
        !isStale && hasData && 'ring-2'
      )}
      style={{
        borderColor: !isStale && hasData ? accentColor : undefined,
        boxShadow: !isStale && hasData ? `0 0 20px ${accentColor}40` : undefined,
      }}
    >
      {/* Zone color bar at top */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accentColor }}
      />

      <div className="p-4">
        {/* Athlete name */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm truncate text-slate-900 dark:text-white">{clientName}</span>
          {onRemove && (
            <button
              onClick={() => onRemove(participant.clientId)}
              className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 text-xs font-medium"
            >
              {copy.remove}
            </button>
          )}
        </div>

        {/* Heart rate display */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {heartRate != null ? (
            <>
              <Heart
                className={cn(
                  'h-6 w-6',
                  !isStale && 'animate-pulse'
                )}
                style={{ color: zoneColor }}
                fill={!isStale ? zoneColor : 'none'}
              />
              <span
                className="text-4xl font-bold tabular-nums"
                style={{ color: zoneColor }}
              >
                {heartRate}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">bpm</span>
            </>
          ) : power == null ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{copy.waitingForData}</span>
            </div>
          ) : null}
        </div>

        {/* Live machine power */}
        {power != null && (
          <div className={cn(heartRate != null && 'mt-2 border-t border-slate-200 dark:border-white/5 pt-2')}>
            {machineLabel && (
              <div className="mb-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {machineLabel}
              </div>
            )}
            <div
              className="flex items-center justify-center gap-2"
            >
              <Bike className="h-5 w-5" style={{ color: powerColor }} />
              <span
                className={cn('font-bold tabular-nums', heartRate != null ? 'text-2xl' : 'text-4xl')}
                style={{ color: powerColor }}
              >
                {power}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">W</span>
              {cadence != null && (
                <span className="text-slate-500 dark:text-slate-400 text-xs">· {cadence} {cadenceUnit}</span>
              )}
            </div>
          </div>
        )}

        {(activeBlock || currentStep) && (
          <div className="mt-3 space-y-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
            {activeBlock && (
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Flag className="h-3.5 w-3.5 text-amber-500" />
                <span className="truncate font-semibold">{activeBlock.label}</span>
              </div>
            )}
            {currentStep && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Target className="h-3.5 w-3.5 text-blue-500" />
                <span className="truncate">
                  {copy.target}: {currentStep.label}{targetText ? ` · ${targetText}` : ''}
                </span>
              </div>
            )}
            {guidance.timer && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" />
                    {guidance.timer.isOvertime
                      ? `${formatClock(guidance.timer.elapsedSeconds - guidance.timer.durationSeconds)} ${copy.overtime}`
                      : `${formatClock(guidance.timer.remainingSeconds)} ${copy.remaining}`}
                  </span>
                  <span>{Math.round(guidance.timer.progress * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={cn('h-full rounded-full', guidance.timer.isOvertime ? 'bg-amber-500' : 'bg-blue-500')}
                    style={{ width: `${Math.min(100, Math.round(guidance.timer.progress * 100))}%` }}
                  />
                </div>
              </div>
            )}
            {guidance.metrics.length > 0 && (
              <div className="grid grid-cols-1 gap-1 pt-1">
                {guidance.metrics.slice(0, 3).map((metric) => (
                  <div
                    key={metric.key}
                    className={cn('flex items-center justify-between gap-2 rounded border px-2 py-1', guidanceClass(metric.status))}
                  >
                    <span className="font-semibold">{copy.metric[metric.key]}</span>
                    <span className="truncate tabular-nums">
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

        {/* Zone badge */}
        <div className="flex justify-center mt-3">
          {zone && heartRate != null ? (
            <Badge
              variant="secondary"
              className="text-white text-xs border-none font-semibold"
              style={{ backgroundColor: zoneColor }}
            >
              {copy.zone} {zone} - {zoneName}
            </Badge>
          ) : powerZone && power != null ? (
            <Badge
              variant="secondary"
              className="text-white text-xs border-none font-semibold"
              style={{ backgroundColor: powerColor }}
            >
              {copy.zone} {powerZone} - {zoneNames[powerZone as keyof typeof zoneNames]}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-slate-350 dark:border-white/10 text-slate-700 dark:text-slate-300">
              {isStale ? copy.noSignal : copy.waiting}
            </Badge>
          )}
        </div>

        {/* Stale indicator */}
        {isStale && hasData && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 dark:bg-slate-950/90 p-2 rounded-md border border-slate-200 dark:border-white/10 shadow-lg">
            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{copy.noSignal}</span>
          </div>
        )}
      </div>
    </RolePanel>
  )
}
