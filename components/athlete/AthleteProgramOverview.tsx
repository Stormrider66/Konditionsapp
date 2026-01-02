// components/athlete/AthleteProgramOverview.tsx
'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Target, TrendingUp, Activity, Timer, Zap, Trophy, ClipboardList } from 'lucide-react'
import { HyroxRaceAnalysisCard } from './HyroxRaceAnalysisCard'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface AthleteProgramOverviewProps {
  program: any
}

export function AthleteProgramOverview({ program }: AthleteProgramOverviewProps) {
  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100)
  const isActive = isActiveProgram(program)
  const currentPhase = getCurrentPhase(program)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              {program.name}
            </h1>
            <div className="flex items-center gap-2">
              {isActive && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest">
                  Aktivt
                </Badge>
              )}
              <Badge variant="outline" className={cn("rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest border-0", getPhaseBadgeClass(currentPhase, true))}>
                Phase: {formatPhase(currentPhase)}
              </Badge>
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            Skräddarsydd träningsplan · {program.client?.name}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl pr-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-600/20">
            <Trophy className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Programmål</p>
            <p className="text-sm font-black text-white uppercase italic">{formatGoalType(program.goalType)}</p>
          </div>
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Timer className="h-16 w-16 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Programframfart</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black text-white">{currentWeek}</span>
            <span className="text-slate-500 font-bold">/ {totalWeeks} veckor</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-blue-500">{progressPercent}% slutfört</span>
              <span className="text-slate-600">{totalWeeks - currentWeek} kvar</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 text-emerald-500">Nuvarande fas</p>
          <div className="mb-4">
            <p className="text-2xl font-black text-white uppercase italic tracking-tighter">{formatPhase(currentPhase)}</p>
          </div>
          <div className="flex gap-1">
            {program.weeks?.map((w: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  w.weekNumber === currentWeek ? "bg-blue-500" :
                    w.weekNumber < currentWeek ? "bg-emerald-500/40" : "bg-white/5"
                )}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Startdatum</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-lg font-black text-white">
              {format(new Date(program.startDate), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Slutdatum</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-lg font-black text-white">
              {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Purpose & Info */}
        <div className="lg:col-span-2 space-y-8">
          {program.notes && (
            <GlassCard className="border-blue-600/10 bg-blue-600/5">
              <GlassCardHeader className="pb-4">
                <GlassCardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  Programmets syfte
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{program.notes}</p>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Test Info */}
          {program.test && (
            <GlassCard>
              <GlassCardHeader className="pb-4">
                <GlassCardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Fysiologisk Bas
                </GlassCardTitle>
                <GlassCardDescription className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                  DATA FRÅN DIN SENASTE TEST ( {format(new Date(program.test.testDate), 'd MMM yyyy', { locale: sv })} )
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Testtyp</p>
                    <p className="text-xl font-black text-white">{program.test.testType}</p>
                  </div>
                  {program.test.vo2max && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">VO2 Max</p>
                      <p className="text-xl font-black text-emerald-400">
                        {program.test.vo2max.toFixed(1)} <span className="text-xs text-emerald-700">ml/kg/min</span>
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Kapacitet</p>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={cn("h-1 w-4 rounded-full", i <= 4 ? "bg-emerald-500" : "bg-white/10")} />
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
        </div>

        {/* HYROX Race Analysis - show for HYROX programs */}
        <div className="lg:col-span-1">
          {isHyroxProgram(program) && program.client?.sportProfile?.hyroxSettings && (
            <HyroxRaceAnalysisCard
              stationTimes={extractHyroxStationTimes(program.client.sportProfile.hyroxSettings)}
              averageRunPace={extractRunPace(program.client.sportProfile.hyroxSettings)}
              compact={true}
              variant="glass"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getCurrentWeek(program: any): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
}

function getCurrentPhase(program: any): string {
  if (!program.weeks || program.weeks.length === 0) return 'BASE'
  const currentWeekNum = getCurrentWeek(program)
  const currentWeek = program.weeks.find((w: any) => w.weekNumber === currentWeekNum)
  return currentWeek?.phase || 'BASE'
}

function isActiveProgram(program: any): boolean {
  const now = new Date()
  const start = new Date(program.startDate)
  const end = new Date(program.endDate)
  return now >= start && now <= end
}

function formatGoalType(goalType: string): string {
  const types: Record<string, string> = {
    marathon: 'Marathon',
    'half-marathon': 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    fitness: 'Kondition',
    cycling: 'Cykling',
    skiing: 'Skidåkning',
    custom: 'Anpassad',
  }
  return types[goalType] || goalType
}

function formatPhase(phase: string): string {
  const phases: Record<string, string> = {
    BASE: 'Bas',
    BUILD: 'Uppbyggnad',
    PEAK: 'Peak',
    TAPER: 'Taper',
    RECOVERY: 'Återhämtning',
    TRANSITION: 'Övergång',
  }
  return phases[phase] || phase
}

function getPhaseBadgeClass(phase: string, isGlass: boolean = false): string {
  if (isGlass) {
    const classes: Record<string, string> = {
      BASE: 'bg-blue-500/10 text-blue-400',
      BUILD: 'bg-orange-500/10 text-orange-400',
      PEAK: 'bg-red-500/10 text-red-400',
      TAPER: 'bg-emerald-500/10 text-emerald-400',
      RECOVERY: 'bg-purple-500/10 text-purple-400',
      TRANSITION: 'bg-slate-500/10 text-slate-400',
    }
    return classes[phase] || 'bg-white/5 text-slate-400'
  }

  const classes: Record<string, string> = {
    BASE: 'border-blue-500 text-blue-700',
    BUILD: 'border-orange-500 text-orange-700',
    PEAK: 'border-red-500 text-red-700',
    TAPER: 'border-green-500 text-green-700',
    RECOVERY: 'border-purple-500 text-purple-700',
    TRANSITION: 'border-gray-500 text-gray-700',
  }
  return classes[phase] || ''
}

function isHyroxProgram(program: any): boolean {
  // Check if program name contains HYROX or if goalType indicates HYROX
  const name = program.name?.toLowerCase() || ''
  const goalType = program.goalType?.toLowerCase() || ''
  return name.includes('hyrox') || goalType.includes('hyrox') || goalType === 'pro' || goalType === 'beginner' || goalType === 'intermediate'
}

function extractHyroxStationTimes(settings: any): Record<string, number | null> {
  if (!settings) return {}
  return {
    skierg: settings.skiErgTime ?? null,
    sledPush: settings.sledPushTime ?? null,
    sledPull: settings.sledPullTime ?? null,
    burpeeBroadJump: settings.burpeeBroadJumpTime ?? null,
    rowing: settings.rowingTime ?? null,
    farmersCarry: settings.farmersCarryTime ?? null,
    sandbagLunge: settings.sandbagLungeTime ?? null,
    wallBalls: settings.wallBallTime ?? null,
  }
}

function extractRunPace(settings: any): number | undefined {
  if (!settings) return undefined
  // If we have a 5K time, calculate average pace per km with fatigue factor
  if (settings.fiveKmTime) {
    return Math.round((settings.fiveKmTime / 5) * 1.1) // 10% slower due to HYROX fatigue
  }
  return undefined
}
