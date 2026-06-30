'use client'

/**
 * LiveTargetCues
 *
 * The live actual-vs-target indicators shared by the interval timer and the
 * non-timed (distance/calorie) effort screen in cardio focus mode: power (W),
 * pace (sec/500m or /km) and heart rate. When a machine or HR band is
 * connected each shows the live reading next to its target, coloured by an
 * above/on/below cue (blue = easier than target, green = on, red = harder);
 * otherwise the plain target is shown. Renders a fragment so the caller owns
 * the surrounding flex layout.
 */

import { Zap, Gauge, Heart, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'
import { targetStatus, type TargetStatus } from '@/lib/cardio/focus-mode-segments'

const TARGET_STATUS_STYLE: Record<TargetStatus, { pill: string; Icon: typeof ArrowUp }> = {
  below: { pill: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300', Icon: ArrowDown },
  on: { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', Icon: Check },
  above: { pill: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', Icon: ArrowUp },
}

const ZONE_COLORS = [
  '', // Zone 0 (unused)
  'bg-gray-200 text-gray-700', // Zone 1
  'bg-blue-200 text-blue-700', // Zone 2
  'bg-green-200 text-green-700', // Zone 3
  'bg-yellow-200 text-yellow-700', // Zone 4
  'bg-red-200 text-red-700', // Zone 5
]

// Round first, then split, so 119.6 s renders "2:00" not "1:60".
function mmss(secs: number): string {
  const total = Math.round(secs)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export interface LiveTargetCuesProps {
  /** Resolved target power in watts. */
  targetPower?: number
  /** Label for a relative power target not yet resolved, e.g. "80% prolog". */
  targetPowerPending?: string
  /** Live power from a connected machine, in watts. */
  livePower?: number
  /** Target pace in sec/500m (rowing) or sec/km. */
  targetPace?: number
  /** Unit suffix for pace. Default '/km'; '/500m' for row/ski erg. */
  paceUnit?: string
  /** Live pace from a connected rower/SkiErg, in sec/500m. */
  livePace?: number
  /** Target HR zone (1-5). */
  targetZone?: number
  /** Live heart rate in bpm. */
  liveHeartRate?: number
  /** The athlete's current HR zone for the live reading (1-5). */
  liveHrZone?: number
  /** Color (hex) for the live HR zone badge. */
  liveHrColor?: string
}

export function LiveTargetCues({
  targetPower,
  targetPowerPending,
  livePower,
  targetPace,
  paceUnit = '/km',
  livePace,
  targetZone,
  liveHeartRate,
  liveHrZone,
  liveHrColor,
}: LiveTargetCuesProps) {
  const t = useTranslations('components.intervalTimer')
  const locale = useLocale()
  const tw = (sv: string, en: string) => (locale === 'sv' ? sv : en)

  const powerStatus = targetStatus(livePower, targetPower, { minAbsolute: 5 })
  const powerDelta =
    livePower != null && targetPower != null ? Math.round(livePower) - targetPower : null
  // Pace (sec/500m): lower = faster = harder, so invert. Band ±2 s.
  const paceStatus = targetStatus(livePace, targetPace, { tolerancePct: 0, minAbsolute: 2, invert: true })
  const paceDeltaAbs =
    livePace != null && targetPace != null ? Math.abs(Math.round(livePace) - targetPace) : null
  // HR is compared by zone band (discrete), not raw bpm.
  const hrStatus: TargetStatus | null =
    liveHrZone != null && targetZone != null
      ? liveHrZone < targetZone
        ? 'below'
        : liveHrZone > targetZone
          ? 'above'
          : 'on'
      : null

  return (
    <>
      {/* Pace: live sec/500m vs target with above/on/below cue. */}
      {livePace != null ? (
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1',
            paceStatus ? TARGET_STATUS_STYLE[paceStatus].pill : 'bg-muted text-foreground',
          )}
        >
          <Gauge className="h-4 w-4" />
          <span className="text-base font-black tabular-nums">{mmss(livePace)}{paceUnit}</span>
          {targetPace != null && <span className="text-xs font-medium opacity-80">/ {mmss(targetPace)}</span>}
          {paceStatus && targetPace != null && (() => {
            const { Icon } = TARGET_STATUS_STYLE[paceStatus]
            return (
              <span className="ml-0.5 flex items-center gap-0.5 text-xs font-bold">
                <Icon className="h-3.5 w-3.5" />
                {paceStatus === 'on' ? tw('På mål', 'On target') : `${paceDeltaAbs}s`}
              </span>
            )
          })()}
        </div>
      ) : targetPace != null ? (
        <div className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{mmss(targetPace)}{paceUnit}</span>
        </div>
      ) : null}

      {/* Power: live watts vs target with above/on/below cue. */}
      {livePower != null ? (
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1',
            powerStatus ? TARGET_STATUS_STYLE[powerStatus].pill : 'bg-muted text-foreground',
          )}
        >
          <Zap className="h-4 w-4" />
          <span className="text-base font-black tabular-nums">{Math.round(livePower)}</span>
          <span className="text-xs font-medium opacity-80">
            {targetPower != null ? `/ ${targetPower} W` : 'W'}
          </span>
          {powerStatus && (() => {
            const { Icon } = TARGET_STATUS_STYLE[powerStatus]
            return (
              <span className="ml-0.5 flex items-center gap-0.5 text-xs font-bold">
                <Icon className="h-3.5 w-3.5" />
                {powerStatus === 'on'
                  ? tw('På mål', 'On target')
                  : `${powerDelta != null && powerDelta > 0 ? '+' : ''}${powerDelta}`}
              </span>
            )
          })()}
        </div>
      ) : targetPower != null ? (
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="font-bold">{targetPower} W</span>
        </div>
      ) : targetPowerPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span className="font-medium">{targetPowerPending}</span>
        </div>
      ) : null}

      {/* Heart rate: live bpm + zone vs the segment's target zone. */}
      {liveHeartRate != null ? (
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1',
            hrStatus ? TARGET_STATUS_STYLE[hrStatus].pill : 'bg-muted text-foreground',
          )}
        >
          <Heart
            className="h-4 w-4 fill-current"
            style={!hrStatus && liveHrColor ? { color: liveHrColor } : undefined}
          />
          <span className="text-base font-black tabular-nums">{liveHeartRate}</span>
          {liveHrZone != null && <span className="text-xs font-medium opacity-80">Z{liveHrZone}</span>}
          {targetZone != null && (() => {
            const Icon = hrStatus ? TARGET_STATUS_STYLE[hrStatus].Icon : null
            return (
              <span className="ml-0.5 flex items-center gap-0.5 text-xs font-bold">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {tw('mål', 'target')} Z{targetZone}
              </span>
            )
          })()}
        </div>
      ) : targetZone ? (
        <Badge className={cn('text-xs', ZONE_COLORS[targetZone])}>
          <Heart className="h-3 w-3 mr-1" />
          {t('zone', { zone: targetZone })}
        </Badge>
      ) : null}
    </>
  )
}

export default LiveTargetCues
