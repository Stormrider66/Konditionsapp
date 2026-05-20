'use client'

import { useLocale } from 'next-intl'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Users } from 'lucide-react'

interface TeamGroupStats {
  teamName: string
  athleteCount: number
  vo2max: { avg: number | null; min: number | null; max: number | null }
  maxHR: { avg: number | null; min: number | null; max: number | null }
  maxLactate: { avg: number | null; min: number | null; max: number | null }
}

interface GroupStatsProps {
  stats: TeamGroupStats[]
}

function StatValue({ label, avg, min, max, unit }: {
  label: string; avg: number | null; min: number | null; max: number | null; unit: string
}) {
  if (avg === null) return null
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-xl font-bold">{avg.toFixed(1)}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
      {min !== null && max !== null && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {min.toFixed(1)} – {max.toFixed(1)}
        </p>
      )}
    </div>
  )
}

export function GroupStats({ stats }: GroupStatsProps) {
  const locale = useLocale()

  if (stats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {locale === 'sv' ? 'Inga testresultat tillgängliga' : 'No test results available'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {stats.map((team) => (
        <GlassCard key={team.teamName} glow="blue">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {team.teamName}
              <span className="text-xs text-muted-foreground font-normal">
                {team.athleteCount} {locale === 'sv' ? 'atleter' : 'athletes'}
              </span>
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-3 gap-4">
              <StatValue label="VO2max" avg={team.vo2max.avg} min={team.vo2max.min} max={team.vo2max.max} unit="ml/kg/min" />
              <StatValue label="Max HR" avg={team.maxHR.avg} min={team.maxHR.min} max={team.maxHR.max} unit="bpm" />
              <StatValue label={locale === 'sv' ? 'Max Laktat' : 'Max lactate'} avg={team.maxLactate.avg} min={team.maxLactate.min} max={team.maxLactate.max} unit="mmol/L" />
            </div>
          </GlassCardContent>
        </GlassCard>
      ))}
    </div>
  )
}
