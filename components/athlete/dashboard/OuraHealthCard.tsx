'use client'

/**
 * OuraHealthCard — Compact Oura Ring metrics for the dashboard.
 *
 * Reads directly from `DailyMetrics.factorScores.oura` so it shows Oura's own
 * values regardless of which device the recovery-source resolver picked.
 * Adds two signals Garmin doesn't expose: Oura's native sleep score (0–100)
 * and readiness score (0–100).
 */

import { Activity, Heart, Moon, Sparkles, Wind, Zap } from 'lucide-react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/GlassCard'

interface OuraSleepBreakdown {
  totalSleepMinutes?: number | null
  deepMinutes?: number | null
  lightMinutes?: number | null
  remMinutes?: number | null
  awakeMinutes?: number | null
  efficiency?: number | null
  averageHR?: number | null
  lowestHR?: number | null
  averageHRV?: number | null
  bedtimeStart?: string | null
  bedtimeEnd?: string | null
}

export interface OuraFactorScores {
  sleep?: OuraSleepBreakdown | null
  dailySleepScore?: number | null
  readinessScore?: number | null
  readinessContributors?: Record<string, number> | null
  temperatureDeviation?: number | null
  spo2Average?: number | null
  stressDaySummary?: string | null
  syncedAt?: string | null
}

interface OuraHealthCardProps {
  oura?: OuraFactorScores | null
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-slate-400'
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-cyan-400'
  if (score >= 55) return 'text-amber-400'
  return 'text-orange-400'
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return ''
  if (score >= 85) return 'Optimal'
  if (score >= 70) return 'Bra'
  if (score >= 55) return 'OK'
  return 'Låg'
}

function stressBadgeColor(summary: string | null | undefined): string {
  switch (summary) {
    case 'restored':
      return 'text-emerald-400'
    case 'normal':
    case 'balanced':
      return 'text-cyan-400'
    case 'stressful':
      return 'text-orange-400'
    default:
      return 'text-slate-400'
  }
}

function stressBadgeLabel(summary: string | null | undefined): string {
  switch (summary) {
    case 'restored': return 'Återhämtad'
    case 'normal': return 'Normal'
    case 'balanced': return 'Balanserad'
    case 'stressful': return 'Stressig'
    default: return ''
  }
}

export function OuraHealthCard({ oura }: OuraHealthCardProps) {
  if (!oura) return null

  const sleep = oura.sleep
  const sleepHours = sleep?.totalSleepMinutes ? sleep.totalSleepMinutes / 60 : null
  const hrv = sleep?.averageHRV ?? null
  const restingHR = sleep?.lowestHR ?? null
  const readiness = oura.readinessScore ?? null
  const sleepScore = oura.dailySleepScore ?? null
  const spo2 = oura.spo2Average ?? null
  const stressDay = oura.stressDaySummary ?? null

  const hasData =
    hrv != null ||
    restingHR != null ||
    sleepHours != null ||
    readiness != null ||
    sleepScore != null

  if (!hasData) return null

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            </span>
            <span className="font-black uppercase italic tracking-tight text-white">Oura Ring</span>
          </GlassCardTitle>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Top row — Oura's signature scores: Readiness + Sleep score */}
        {(readiness != null || sleepScore != null) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {readiness != null && (
              <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-300/80 mb-1">
                  <Zap className="h-3 w-3" />
                  Beredskap
                </div>
                <div className={`text-2xl font-black ${scoreColor(readiness)}`}>
                  {readiness}<span className="text-sm font-medium text-slate-500">/100</span>
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${scoreColor(readiness)}`}>
                  {scoreLabel(readiness)}
                </div>
              </div>
            )}
            {sleepScore != null && (
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 mb-1">
                  <Moon className="h-3 w-3" />
                  Sömnpoäng
                </div>
                <div className={`text-2xl font-black ${scoreColor(sleepScore)}`}>
                  {sleepScore}<span className="text-sm font-medium text-slate-500">/100</span>
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${scoreColor(sleepScore)}`}>
                  {scoreLabel(sleepScore)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Standard metrics grid */}
        <div className="grid grid-cols-2 gap-4">
          {hrv != null && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                HRV
              </div>
              <div className="text-xl font-black text-white">
                {Math.round(hrv)} <span className="text-sm font-medium text-slate-500">ms</span>
              </div>
            </div>
          )}

          {restingHR != null && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Heart className="h-3.5 w-3.5 text-red-400" />
                Vilo-HR
              </div>
              <div className="text-xl font-black text-white">
                {Math.round(restingHR)} <span className="text-sm font-medium text-slate-500">bpm</span>
              </div>
            </div>
          )}

          {sleepHours != null && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                Sömn
              </div>
              <div className="text-xl font-black text-white">
                {sleepHours.toFixed(1)} <span className="text-sm font-medium text-slate-500">h</span>
              </div>
              {sleep?.efficiency != null && (
                <div className="text-[10px] font-bold text-slate-500">
                  Effektivitet: {Math.round(sleep.efficiency)}%
                </div>
              )}
            </div>
          )}

          {spo2 != null && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Wind className="h-3.5 w-3.5 text-sky-400" />
                SpO₂
              </div>
              <div className="text-xl font-black text-white">
                {spo2.toFixed(1)}<span className="text-sm font-medium text-slate-500">%</span>
              </div>
            </div>
          )}
        </div>

        {/* Sleep stage breakdown */}
        {sleep && (sleep.deepMinutes != null || sleep.remMinutes != null) && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
              Sömndetaljer
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {sleep.deepMinutes != null && (
                <div>
                  <div className="text-slate-500">Djupsömn</div>
                  <div className="font-bold text-white">{Math.round(sleep.deepMinutes)} min</div>
                </div>
              )}
              {sleep.remMinutes != null && (
                <div>
                  <div className="text-slate-500">REM</div>
                  <div className="font-bold text-white">{Math.round(sleep.remMinutes)} min</div>
                </div>
              )}
              {sleep.lightMinutes != null && (
                <div>
                  <div className="text-slate-500">Lätt</div>
                  <div className="font-bold text-white">{Math.round(sleep.lightMinutes)} min</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stress day summary (qualitative, when available) */}
        {stressDay && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              Dagens stress
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${stressBadgeColor(stressDay)}`}>
              {stressBadgeLabel(stressDay) || stressDay}
            </span>
          </div>
        )}

        {/* Brand attribution (no formal Oura requirement, just clean labelling) */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-600 italic">
          Data från Oura Ring
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
