'use client'

/**
 * GarminHealthCard — Compact Garmin health metrics for the dashboard
 *
 * Shows HRV, Resting HR, Sleep, and Stress from Garmin webhook data
 * stored in DailyMetrics. Includes required Garmin brand attribution.
 */

import { Activity, Heart, Moon, Brain } from 'lucide-react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/GlassCard'
import { GarminAttribution } from '@/components/ui/GarminAttribution'

interface GarminHealthCardProps {
  hrvRMSSD?: number | null
  hrvStatus?: string | null
  restingHR?: number | null
  sleepHours?: number | null
  sleepQuality?: number | null
  stress?: number | null
  sleepDetails?: {
    deepSleepMinutes?: number
    lightSleepMinutes?: number
    remSleepMinutes?: number
    awakeMinutes?: number
  } | null
}

function getHRVStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'BALANCED':
    case 'HIGH':
      return 'text-emerald-400'
    case 'LOW':
    case 'UNBALANCED':
      return 'text-orange-400'
    default:
      return 'text-slate-400'
  }
}

function getHRVStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'BALANCED': return 'Balanserad'
    case 'HIGH': return 'Hög'
    case 'LOW': return 'Låg'
    case 'UNBALANCED': return 'Obalanserad'
    default: return ''
  }
}

export function GarminHealthCard({
  hrvRMSSD,
  hrvStatus,
  restingHR,
  sleepHours,
  sleepQuality,
  stress,
  sleepDetails,
}: GarminHealthCardProps) {
  const hasData = hrvRMSSD || restingHR || sleepHours || stress

  if (!hasData) return null

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <GarminAttribution size="md" />
          </GlassCardTitle>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* HRV */}
          {hrvRMSSD && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                HRV
              </div>
              <div className="text-xl font-black text-white">{Math.round(hrvRMSSD)} <span className="text-sm font-medium text-slate-500">ms</span></div>
              {hrvStatus && (
                <div className={`text-[10px] font-bold uppercase tracking-wider ${getHRVStatusColor(hrvStatus)}`}>
                  {getHRVStatusLabel(hrvStatus)}
                </div>
              )}
            </div>
          )}

          {/* Resting HR */}
          {restingHR && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Heart className="h-3.5 w-3.5 text-red-400" />
                Vilo-HR
              </div>
              <div className="text-xl font-black text-white">{restingHR} <span className="text-sm font-medium text-slate-500">bpm</span></div>
            </div>
          )}

          {/* Sleep */}
          {sleepHours && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                Sömn
              </div>
              <div className="text-xl font-black text-white">{sleepHours.toFixed(1)} <span className="text-sm font-medium text-slate-500">h</span></div>
              {sleepQuality && (
                <div className="text-[10px] font-bold text-slate-500">
                  Kvalitet: {sleepQuality}/10
                </div>
              )}
            </div>
          )}

          {/* Stress */}
          {stress && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Brain className="h-3.5 w-3.5 text-amber-400" />
                Stress
              </div>
              <div className="text-xl font-black text-white">{stress}<span className="text-sm font-medium text-slate-500">/10</span></div>
            </div>
          )}
        </div>

        {/* Sleep breakdown */}
        {sleepDetails && (sleepDetails.deepSleepMinutes || sleepDetails.remSleepMinutes) && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
              Sömndetaljer
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {sleepDetails.deepSleepMinutes !== undefined && (
                <div>
                  <div className="text-slate-500">Djupsömn</div>
                  <div className="font-bold text-white">{Math.round(sleepDetails.deepSleepMinutes)} min</div>
                </div>
              )}
              {sleepDetails.remSleepMinutes !== undefined && (
                <div>
                  <div className="text-slate-500">REM</div>
                  <div className="font-bold text-white">{Math.round(sleepDetails.remSleepMinutes)} min</div>
                </div>
              )}
              {sleepDetails.lightSleepMinutes !== undefined && (
                <div>
                  <div className="text-slate-500">Lätt</div>
                  <div className="font-bold text-white">{Math.round(sleepDetails.lightSleepMinutes)} min</div>
                </div>
              )}
            </div>
          </div>
        )}

        <GarminAttribution derived className="mt-4 pt-3 border-t border-white/5" />
      </GlassCardContent>
    </GlassCard>
  )
}
