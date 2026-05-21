import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { CheckCircle2, FlaskConical, TrendingUp, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import {
  buildFuelingCoachingRecommendation,
  type FuelingCoachingRecommendation,
} from '@/lib/fueling/coaching-recommendation'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { cn } from '@/lib/utils'

type FuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG: number | null
  hydrationMl: number | null
  sodiumMg: number | null
  instructionsSv: string | null
  plan?: {
    name: string | null
    sport?: string | null
    distanceKm?: number | null
    targetSpeedKmh?: number | null
    targetPowerWatts?: number | null
    targetPaceMinKm?: number | null
    raceDate: Date | string | null
    recommendedCarbsGPerHour: number | null
  } | null
}

type FuelingLog = {
  actualCarbsGPerHour: number | null
  actualCarbsTotalG: number | null
  productsUsed?: unknown
  stomachRating: number | null
  energyRating: number | null
}

type ProgramFuelingWorkout = {
  id: string
  name: string
  duration: number | null
  distance: number | null
  fuelingPrescription?: FuelingPrescription | null
  logs?: Array<{ fuelingLog?: FuelingLog | null }>
}

type ProgramFuelingDay = {
  date: Date | string | null
  dayNumber: number
  workouts?: ProgramFuelingWorkout[]
}

type ProgramFuelingWeek = {
  weekNumber: number
  days?: ProgramFuelingDay[]
}

interface ProgramFuelingOverviewProps {
  program: {
    weeks?: ProgramFuelingWeek[]
  }
  className?: string
  locale?: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string | undefined): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => locale === 'sv' ? svText : enText

const dateFnsLocale = (locale: AppLocale) => locale === 'sv' ? sv : enUS

export function ProgramFuelingOverview({ program, className, locale: rawLocale }: ProgramFuelingOverviewProps) {
  const locale = getAppLocale(rawLocale)
  const sessions = collectFuelingSessions(program)

  if (sessions.length === 0) return null

  const targetValues = sessions.map((session) => session.prescription.targetCarbsGPerHour)
  const firstTarget = targetValues[0] ?? null
  const peakTarget = Math.max(...targetValues)
  const loggedCount = sessions.filter((session) => session.log).length
  const latestPlan = sessions.find((session) => session.prescription.plan)?.prescription.plan ?? null
  const raceTarget = latestPlan?.recommendedCarbsGPerHour ?? peakTarget
  const planContext = formatFuelingPlanContext(latestPlan, { includeRaceDate: true, locale })
  const peakProgress = raceTarget > 0 ? Math.min(100, Math.round((peakTarget / raceTarget) * 100)) : 0
  const nextSession = sessions.find((session) => !session.log) ?? sessions[sessions.length - 1]
  const recommendation = buildFuelingCoachingRecommendation({
    raceTargetGPerHour: raceTarget,
    logs: [...sessions].reverse().map((session) => ({
      plannedCarbsGPerHour: session.prescription.targetCarbsGPerHour,
      actualCarbsGPerHour: session.log?.actualCarbsGPerHour ?? null,
      actualCarbsTotalG: session.log?.actualCarbsTotalG ?? null,
      productsUsed: session.log?.productsUsed,
      stomachRating: session.log?.stomachRating ?? null,
      energyRating: session.log?.energyRating ?? null,
    })),
  })

  return (
    <GlassCard className={cn('rounded-2xl', className)}>
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <GlassCardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <FlaskConical className="h-5 w-5 text-orange-500" />
              {t(locale, 'Kolhydratsträning i programmet', 'Carbohydrate training in the program')}
            </GlassCardTitle>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {t(
                locale,
                'Planerade pass där energiintaget tränas upp inför målet, med faktisk tolerans från loggade pass.',
                'Planned sessions that build fueling toward the goal, using real tolerance from logged sessions.'
              )}
            </p>
          </div>
          <Badge className="w-fit rounded-full bg-orange-100 px-3 py-1 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300">
            {sessions.length} {t(locale, 'pass', sessions.length === 1 ? 'session' : 'sessions')}
          </Badge>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricTile label={t(locale, 'Startnivå', 'Starting level')} value={firstTarget ? `${Math.round(firstTarget)} g/h` : '-'} />
          <MetricTile label={t(locale, 'Högsta mål', 'Highest target')} value={`${Math.round(peakTarget)} g/h`} tone="orange" />
          <MetricTile label={t(locale, 'Loggade pass', 'Logged sessions')} value={`${loggedCount}/${sessions.length}`} tone="green" />
          <MetricTile
            label={t(locale, 'Racemål', 'Race target')}
            value={raceTarget ? `${Math.round(raceTarget)} g/h` : '-'}
            tone="blue"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t(locale, 'Progression mot racenivå', 'Progression toward race level')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {latestPlan?.name ?? t(locale, 'Senaste fuelingplan', 'Latest fueling plan')}{' '}
                {nextSession ? `- ${t(locale, 'nästa fokus', 'next focus')}: ${Math.round(nextSession.prescription.targetCarbsGPerHour)} g/h` : ''}
              </p>
              {planContext && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {planContext}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-black text-orange-600 dark:text-orange-300">
              <TrendingUp className="h-4 w-4" />
              {peakProgress}%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${peakProgress}%` }}
            />
          </div>
        </div>

        <ProgramFuelingRecommendationBox recommendation={recommendation} locale={locale} />

        <div className="space-y-3">
          {sessions.map((session) => (
            <FuelingSessionRow key={session.workout.id} session={session} locale={locale} />
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

function ProgramFuelingRecommendationBox({
  recommendation,
  locale,
}: {
  recommendation: FuelingCoachingRecommendation
  locale: AppLocale
}) {
  const copy = getRecommendationCopy(recommendation, locale)
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
            {t(locale, 'Rekommendation', 'Recommendation')}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{copy.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.action}
          </p>
        </div>
        {recommendation.nextTargetGPerHour && (
          <Badge variant="outline" className="w-fit shrink-0 rounded-full bg-white/80 dark:bg-slate-950/40">
            {recommendation.nextTargetGPerHour} g/h
          </Badge>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.reason}</p>
      {getRecommendationProduct(recommendation, locale) && (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {getRecommendationProduct(recommendation, locale)}
        </p>
      )}
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: 'slate' | 'orange' | 'green' | 'blue'
}) {
  const toneClass = {
    slate: 'text-slate-900 dark:text-white',
    orange: 'text-orange-600 dark:text-orange-300',
    green: 'text-emerald-600 dark:text-emerald-300',
    blue: 'text-blue-600 dark:text-blue-300',
  }[tone]

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/30">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-2 text-2xl font-black tracking-tight', toneClass)}>{value}</p>
    </div>
  )
}

function FuelingSessionRow({ session, locale }: { session: FuelingSession; locale: AppLocale }) {
  const prescription = session.prescription
  const log = session.log
  const actual = log?.actualCarbsGPerHour ?? null
  const target = prescription.targetCarbsGPerHour
  const targetLabel = `${Math.round(target)} g/h`
  const totalLabel = prescription.targetCarbsTotalG
    ? `${Math.round(prescription.targetCarbsTotalG)} g ${t(locale, 'totalt', 'total')}`
    : null
  const dateLabel = session.date
    ? format(new Date(session.date), 'd MMM', { locale: dateFnsLocale(locale) })
    : `${t(locale, 'Dag', 'Day')} ${session.dayNumber}`

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-950/30 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-slate-300 text-slate-600 dark:border-white/20 dark:text-slate-300">
            {t(locale, 'Vecka', 'Week')} {session.weekNumber} · {dateLabel}
          </Badge>
          {log && (
            <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t(locale, 'Loggad', 'Logged')}
            </Badge>
          )}
        </div>
        <div>
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{session.workout.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {session.workout.duration ? `${session.workout.duration} min` : t(locale, 'Tid saknas', 'Time missing')}
            {session.workout.distance ? ` · ${session.workout.distance.toFixed(1)} km` : ''}
            {totalLabel ? ` · ${totalLabel}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-black text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
          <Utensils className="mr-1 inline h-3.5 w-3.5" />
          {targetLabel}
        </div>
        {actual != null && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {Math.round(actual)} g/h {t(locale, 'faktiskt', 'actual')}
          </div>
        )}
        {log?.stomachRating != null && (
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {t(locale, 'Mage', 'Stomach')} {log.stomachRating}/5
          </div>
        )}
      </div>
    </div>
  )
}

function getRecommendationCopy(recommendation: FuelingCoachingRecommendation, locale: AppLocale) {
  if (locale === 'sv') {
    return {
      label: recommendation.labelSv,
      action: recommendation.actionSv,
      reason: recommendation.reasonSv,
    }
  }

  const nextTarget = recommendation.nextTargetGPerHour
  const copy: Record<FuelingCoachingRecommendation['status'], { label: string; action: string; reason: string }> = {
    NO_DATA: {
      label: 'No clear recommendation yet',
      action: 'Log carbohydrates, stomach response, and energy after the next long session.',
      reason: 'The coaching recommendation needs at least one fueling log.',
    },
    REDUCE: {
      label: 'Step back next session',
      action: `Next long session: aim for ${nextTarget ?? 30} g/h and spread intake more evenly.`,
      reason: 'Stomach response was low, so the target should be stabilized before increasing again.',
    },
    HOLD: {
      label: 'Hold this level',
      action: `Next long session: repeat ${nextTarget ?? 'the current target'} g/h before increasing.`,
      reason: 'The latest signal is not stable enough for a clear progression.',
    },
    PROGRESS: {
      label: 'Increase carefully',
      action: `Next long session: test ${nextTarget ?? 'a slightly higher target'} g/h if the session is race-like.`,
      reason: 'The latest log shows stable stomach response and energy.',
    },
    RACE_READY: {
      label: 'Ready for race target',
      action: `Keep the race target ${nextTarget ?? ''} g/h and repeat with race products.`.trim(),
      reason: 'Multiple sessions show stable stomach response and energy close to the target intake.',
    },
    ON_TRACK: {
      label: 'Follow up',
      action: `Next long session: continue with ${nextTarget ?? 'the current target'} g/h and log the response.`,
      reason: 'There is data, but not a clear enough signal to increase or reduce.',
    },
  }

  return copy[recommendation.status]
}

function getRecommendationProduct(recommendation: FuelingCoachingRecommendation, locale: AppLocale): string | null {
  if (!recommendation.productSv) return null
  if (locale === 'sv') return recommendation.productSv

  return recommendation.productSv
    .replace('Produkt/timing att justera:', 'Product/timing to adjust:')
    .replace('Fungerande produkter att repetera:', 'Working products to repeat:')
    .replace('Produkter från senaste logg:', 'Products from latest log:')
}

type FuelingSession = {
  weekNumber: number
  dayNumber: number
  date: Date | string | null
  workout: ProgramFuelingWorkout
  prescription: FuelingPrescription
  log: FuelingLog | null
}

function collectFuelingSessions(program: ProgramFuelingOverviewProps['program']): FuelingSession[] {
  return (program.weeks ?? []).flatMap((week) =>
    (week.days ?? []).flatMap((day) =>
      (day.workouts ?? [])
        .filter((workout) => Boolean(workout.fuelingPrescription))
        .map((workout) => ({
          weekNumber: week.weekNumber,
          dayNumber: day.dayNumber,
          date: day.date,
          workout,
          prescription: workout.fuelingPrescription as FuelingPrescription,
          log: workout.logs?.find((entry) => entry.fuelingLog)?.fuelingLog ?? null,
        }))
    )
  )
}
