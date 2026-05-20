'use client'

import { Activity, Gauge, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TeamSportPlanningSummary } from '@/lib/program-generator/team-sports/explainability'
import type { WorkoutTheme } from '@/lib/themes'

type TeamSportPlanningSummaryCardProps = {
  summary: TeamSportPlanningSummary
  locale: string
  theme: WorkoutTheme
}

function t(locale: string, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function TeamSportPlanningSummaryCard({
  summary,
  locale,
  theme,
}: TeamSportPlanningSummaryCardProps) {
  const hasLoadGuidance = summary.loadGuidance.length > 0

  return (
    <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <Activity className="h-4 w-4 text-primary" />
              {summary.title}
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              {summary.description}
            </CardDescription>
          </div>
          <Badge variant={hasLoadGuidance ? 'secondary' : 'outline'} className="w-fit">
            <Gauge className="mr-1 h-3.5 w-3.5" />
            {hasLoadGuidance
              ? t(locale, 'Belastning anpassas', 'Load adjusted')
              : t(locale, 'Normal belastning', 'Normal load')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {summary.assumptions.map((item) => (
            <div key={item.label} className="rounded-lg border p-2" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{item.label}</div>
              <div className="mt-1 text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {t(locale, 'Prioriterad prevention', 'Priority prevention')}
            </div>
            <div className="flex flex-wrap gap-1">
              {summary.prevention.map((item) => (
                <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
              <Gauge className="h-4 w-4 text-amber-600" />
              {t(locale, 'Belastningssignal', 'Load signal')}
            </div>
            {hasLoadGuidance ? (
              <ul className="space-y-1 text-sm" style={{ color: theme.colors.textMuted }}>
                {summary.loadGuidance.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'Ingen extra reducering behövs utifrån profilen.', 'No extra reduction is needed from the profile.')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
