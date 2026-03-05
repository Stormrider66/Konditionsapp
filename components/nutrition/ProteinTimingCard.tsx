'use client'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Dumbbell, Moon } from 'lucide-react'

interface ProteinTiming {
  avgWorkoutDayProtein: number | null
  avgRestDayProtein: number | null
  workoutDays: number
  restDays: number
}

interface ProteinTimingCardProps {
  timing: ProteinTiming
}

export function ProteinTimingCard({ timing }: ProteinTimingCardProps) {
  const diff = timing.avgWorkoutDayProtein && timing.avgRestDayProtein
    ? timing.avgWorkoutDayProtein - timing.avgRestDayProtein
    : null

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-400">Protein: träning vs vila</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
            <Dumbbell className="h-5 w-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-blue-400">
              {timing.avgWorkoutDayProtein !== null ? `${timing.avgWorkoutDayProtein}g` : '-'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Träningsdagar</p>
            <p className="text-[10px] text-slate-500">({timing.workoutDays} dagar)</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-slate-500/5 rounded-xl border border-slate-500/10">
            <Moon className="h-5 w-5 text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-300">
              {timing.avgRestDayProtein !== null ? `${timing.avgRestDayProtein}g` : '-'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Vilodagar</p>
            <p className="text-[10px] text-slate-500">({timing.restDays} dagar)</p>
          </div>
        </div>
        {diff !== null && (
          <p className="text-xs text-center text-slate-400 mt-3">
            {diff > 0 ? (
              <span className="text-green-400">+{diff}g protein på träningsdagar</span>
            ) : diff < 0 ? (
              <span className="text-amber-400">{diff}g protein på träningsdagar</span>
            ) : (
              <span>Samma proteinintag oavsett träning</span>
            )}
          </p>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
