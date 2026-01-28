// components/athlete/ActivePrograms.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ActiveProgramSummary } from '@/types/prisma-types'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME, type WorkoutTheme } from '@/lib/themes'

interface ActiveProgramsProps {
  programs: ActiveProgramSummary[]
  variant?: 'default' | 'glass'
  basePath?: string
}

export function ActivePrograms({ programs, variant = 'default', basePath = '' }: ActiveProgramsProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (variant === 'glass') {
    if (programs.length === 0) {
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Aktiva program
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-center py-8 text-slate-500">
              Inga aktiva träningsprogram
            </p>
          </GlassCardContent>
        </GlassCard>
      )
    }

    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            Aktiva program
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} theme={theme} variant="glass" basePath={basePath} />
          ))}
        </GlassCardContent>
      </GlassCard>
    )
  }

  // DEFAULT Render
  if (programs.length === 0) {
    return (
      <Card
        style={{
          backgroundColor: theme.colors.backgroundCard,
          borderColor: theme.colors.border,
        }}
      >
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}
          >
            <Target className="h-5 w-5" />
            Aktiva program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8" style={{ color: theme.colors.textMuted }}>
            Inga aktiva träningsprogram
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        backgroundColor: theme.colors.backgroundCard,
        borderColor: theme.colors.border,
      }}
    >
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          style={{ color: theme.colors.textPrimary }}
        >
          <Target className="h-5 w-5" />
          Aktiva program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} theme={theme} basePath={basePath} />
        ))}
      </CardContent>
    </Card>
  )
}

function ProgramCard({ program, theme, variant = 'default', basePath = '' }: { program: ActiveProgramSummary; theme: WorkoutTheme, variant?: 'default' | 'glass', basePath?: string }) {
  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0
  const currentPhase = getCurrentPhase(program)

  if (variant === 'glass') {
    return (
      <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-black/20 hover:bg-white/5 transition-colors">
        <div>
          <h4 className="font-semibold mb-1 text-white">
            {program.name}
          </h4>
          <p className="text-sm text-slate-400">
            {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
            {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
            {formatPhase(currentPhase)}
          </Badge>
          <span className="text-sm text-slate-500">
            Vecka {currentWeek} av {totalWeeks}
          </span>
        </div>

        <div className="w-full rounded-full h-2 overflow-hidden bg-white/10">
          <div
            className="h-full transition-all bg-orange-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <Link href={`${basePath}/athlete/programs/${program.id}`}>
          <Button variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/5">
            Visa program
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
      }}
    >
      <div>
        <h4
          className="font-semibold mb-1"
          style={{ color: theme.colors.textPrimary }}
        >
          {program.name}
        </h4>
        <p className="text-sm" style={{ color: theme.colors.textMuted }}>
          {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
          {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
          {formatPhase(currentPhase)}
        </Badge>
        <span className="text-sm" style={{ color: theme.colors.textMuted }}>
          Vecka {currentWeek} av {totalWeeks}
        </span>
      </div>

      <div
        className="w-full rounded-full h-2 overflow-hidden"
        style={{ backgroundColor: theme.colors.border }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: theme.colors.accent,
          }}
        />
      </div>

      <Link href={`${basePath}/athlete/programs/${program.id}`}>
        <Button variant="outline" size="sm" className="w-full">
          Visa program
        </Button>
      </Link>
    </div>
  )
}

function getCurrentWeek(program: ActiveProgramSummary): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
}

function getCurrentPhase(program: ActiveProgramSummary): string {
  if (!program.weeks || program.weeks.length === 0) return 'BASE'
  const currentWeekNum = getCurrentWeek(program)
  const currentWeek = program.weeks.find((w) => w.weekNumber === currentWeekNum)
  return currentWeek?.phase || 'BASE'
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

function getPhaseBadgeClass(phase: string): string {
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
