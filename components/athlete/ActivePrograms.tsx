// components/athlete/ActivePrograms.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, Sparkles, Dumbbell, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { ActiveProgramSummary } from '@/types/prisma-types'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME, type WorkoutTheme } from '@/lib/themes'
import { NewProgramDialog } from '@/components/athlete/workout/NewProgramDialog'
import { WODGeneratorModal } from '@/components/athlete/wod'
import type { WODResponse } from '@/types/wod'

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const dateLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

interface ActiveProgramsProps {
  programs: ActiveProgramSummary[]
  variant?: 'default' | 'glass'
  basePath?: string
  lastCompletedProgram?: { id: string; name: string; endDate: Date }
  athleteContext?: { isAICoached: boolean; hasCoach: boolean }
  wodUsage?: { remaining: number; isUnlimited: boolean }
}

export function ActivePrograms({
  programs,
  variant = 'default',
  basePath = '',
  lastCompletedProgram,
  athleteContext,
  wodUsage,
}: ActiveProgramsProps) {
  const locale = getAppLocale(useLocale())
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (variant === 'glass') {
    if (programs.length === 0) {
      if (lastCompletedProgram) {
        return (
          <WhatsNextCard
            variant="glass"
            basePath={basePath}
            lastCompletedProgram={lastCompletedProgram}
            athleteContext={athleteContext}
            wodUsage={wodUsage}
          />
        )
      }
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              {t(locale, 'Aktiva program', 'Active programs')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-center py-8 text-slate-500">
              {t(locale, 'Inga aktiva träningsprogram', 'No active training programs')}
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
            {t(locale, 'Aktiva program', 'Active programs')}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} theme={theme} variant="glass" basePath={basePath} locale={locale} />
          ))}
        </GlassCardContent>
      </GlassCard>
    )
  }

  // DEFAULT Render
  if (programs.length === 0) {
    if (lastCompletedProgram) {
      return (
        <WhatsNextCard
          variant="default"
          basePath={basePath}
          lastCompletedProgram={lastCompletedProgram}
          athleteContext={athleteContext}
          wodUsage={wodUsage}
        />
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
            {t(locale, 'Aktiva program', 'Active programs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8" style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Inga aktiva träningsprogram', 'No active training programs')}
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
          {t(locale, 'Aktiva program', 'Active programs')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} theme={theme} basePath={basePath} locale={locale} />
        ))}
      </CardContent>
    </Card>
  )
}

function ProgramCard({
  program,
  theme,
  variant = 'default',
  basePath = '',
  locale,
}: {
  program: ActiveProgramSummary
  theme: WorkoutTheme
  variant?: 'default' | 'glass'
  basePath?: string
  locale: AppLocale
}) {
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
            {format(new Date(program.startDate), 'd MMM', { locale: dateLocale(locale) })} -{' '}
            {format(new Date(program.endDate), 'd MMM yyyy', { locale: dateLocale(locale) })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
            {formatPhase(currentPhase, locale)}
          </Badge>
          <span className="text-sm text-slate-500">
            {t(locale, 'Vecka', 'Week')} {currentWeek} {t(locale, 'av', 'of')} {totalWeeks}
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
            {t(locale, 'Visa program', 'View program')}
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
          {format(new Date(program.startDate), 'd MMM', { locale: dateLocale(locale) })} -{' '}
          {format(new Date(program.endDate), 'd MMM yyyy', { locale: dateLocale(locale) })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
          {formatPhase(currentPhase, locale)}
        </Badge>
        <span className="text-sm" style={{ color: theme.colors.textMuted }}>
          {t(locale, 'Vecka', 'Week')} {currentWeek} {t(locale, 'av', 'of')} {totalWeeks}
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
          {t(locale, 'Visa program', 'View program')}
        </Button>
      </Link>
    </div>
  )
}

function WhatsNextCard({
  variant,
  basePath,
  lastCompletedProgram,
  athleteContext,
  wodUsage,
}: {
  variant: 'default' | 'glass'
  basePath: string
  lastCompletedProgram: { id: string; name: string; endDate: Date }
  athleteContext?: { isAICoached: boolean; hasCoach: boolean }
  wodUsage?: { remaining: number; isUnlimited: boolean }
}) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [showWODModal, setShowWODModal] = useState(false)
  const [notifyingCoach, setNotifyingCoach] = useState(false)
  const [coachNotified, setCoachNotified] = useState(false)

  const handleWODGenerated = (response: WODResponse) => {
    setShowWODModal(false)
    if (response.metadata?.requestId) {
      router.push(`${basePath}/athlete/wod/${response.metadata.requestId}`)
    }
  }

  const handleNotifyCoach = async () => {
    if (coachNotified) return
    setNotifyingCoach(true)
    try {
      const res = await fetch(`/api/programs/${lastCompletedProgram.id}/request-next`, {
        method: 'POST',
      })
      if (res.ok) setCoachNotified(true)
    } catch {
      // silently handle
    } finally {
      setNotifyingCoach(false)
    }
  }

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-3">
        {t(locale, 'Du slutförde', 'You completed')} <span className="font-medium">{lastCompletedProgram.name}</span>.
        {' '}{t(locale, 'Vad är nästa steg?', 'What is next?')}
      </p>

      {athleteContext?.hasCoach && !athleteContext?.isAICoached ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          disabled={notifyingCoach || coachNotified}
          onClick={handleNotifyCoach}
        >
          {notifyingCoach ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : coachNotified ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <MessageSquare className="h-4 w-4 text-blue-500" />
          )}
          {coachNotified ? t(locale, 'Coach meddelad!', 'Coach notified!') : t(locale, 'Meddela din coach', 'Notify your coach')}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setShowDialog(true)}
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          {t(locale, 'Skapa nytt program', 'Create new program')}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => {
          if (wodUsage) {
            setShowWODModal(true)
          } else {
            router.push(`${basePath}/athlete/wod/history`)
          }
        }}
      >
        <Dumbbell className="h-4 w-4 text-green-500" />
        {t(locale, 'Träna fritt med WOD', 'Train freely with WOD')}
      </Button>

      {wodUsage && (
        <WODGeneratorModal
          open={showWODModal}
          onOpenChange={setShowWODModal}
          onWODGenerated={handleWODGenerated}
          remainingWODs={wodUsage.remaining}
          isUnlimited={wodUsage.isUnlimited}
        />
      )}

      <NewProgramDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isAICoached={athleteContext?.isAICoached ?? false}
        primarySport={null}
        basePath={basePath}
        completedProgramId={lastCompletedProgram.id}
      />
    </div>
  )

  if (variant === 'glass') {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            {t(locale, 'Vad är nästa steg?', 'What is next?')}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>{content}</GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          {t(locale, 'Vad är nästa steg?', 'What is next?')}
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
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

function formatPhase(phase: string, locale: AppLocale): string {
  const phases: Record<string, Record<AppLocale, string>> = {
    BASE: { en: 'Base', sv: 'Bas' },
    BUILD: { en: 'Build', sv: 'Uppbyggnad' },
    PEAK: { en: 'Peak', sv: 'Peak' },
    TAPER: { en: 'Taper', sv: 'Taper' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    TRANSITION: { en: 'Transition', sv: 'Övergång' },
  }
  return phases[phase]?.[locale] || phase
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
