'use client'

import { LiveHRParticipantData, ZONE_COLORS, ZONE_NAMES_EN, ZONE_NAMES_SV } from '@/lib/live-hr/types'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Heart, AlertCircle, Bike } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

interface AthleteHRCardProps {
  participant: LiveHRParticipantData
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
}> = {
  en: {
    unknown: 'Unknown',
    remove: 'Remove',
    waitingForData: 'Waiting for data...',
    noSignal: 'No signal',
    waiting: 'Waiting...',
    zone: 'Zone',
  },
  sv: {
    unknown: 'Okänd',
    remove: 'Ta bort',
    waitingForData: 'Väntar på data...',
    noSignal: 'Ingen signal',
    waiting: 'Väntar...',
    zone: 'Zon',
  },
}

export function AthleteHRCard({ participant, onRemove }: AthleteHRCardProps) {
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
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-450 text-xs font-medium"
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
            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{copy.noSignal}</span>
          </div>
        )}
      </div>
    </RolePanel>
  )
}
