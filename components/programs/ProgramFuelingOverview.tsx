import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CheckCircle2, FlaskConical, TrendingUp, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

type FuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG: number | null
  hydrationMl: number | null
  sodiumMg: number | null
  instructionsSv: string | null
  plan?: {
    name: string | null
    raceDate: Date | string | null
    recommendedCarbsGPerHour: number | null
  } | null
}

type FuelingLog = {
  actualCarbsGPerHour: number | null
  actualCarbsTotalG: number | null
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
}

export function ProgramFuelingOverview({ program, className }: ProgramFuelingOverviewProps) {
  const sessions = collectFuelingSessions(program)

  if (sessions.length === 0) return null

  const targetValues = sessions.map((session) => session.prescription.targetCarbsGPerHour)
  const firstTarget = targetValues[0] ?? null
  const peakTarget = Math.max(...targetValues)
  const loggedCount = sessions.filter((session) => session.log).length
  const latestPlan = sessions.find((session) => session.prescription.plan)?.prescription.plan ?? null
  const raceTarget = latestPlan?.recommendedCarbsGPerHour ?? peakTarget
  const peakProgress = raceTarget > 0 ? Math.min(100, Math.round((peakTarget / raceTarget) * 100)) : 0
  const nextSession = sessions.find((session) => !session.log) ?? sessions[sessions.length - 1]

  return (
    <GlassCard className={cn('rounded-2xl', className)}>
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <GlassCardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <FlaskConical className="h-5 w-5 text-orange-500" />
              Kolhydratsträning i programmet
            </GlassCardTitle>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Planerade pass där energiintaget tränas upp inför målet, med faktisk tolerans från loggade pass.
            </p>
          </div>
          <Badge className="w-fit rounded-full bg-orange-100 px-3 py-1 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300">
            {sessions.length} pass
          </Badge>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricTile label="Startnivå" value={firstTarget ? `${Math.round(firstTarget)} g/h` : '-'} />
          <MetricTile label="Högsta mål" value={`${Math.round(peakTarget)} g/h`} tone="orange" />
          <MetricTile label="Loggade pass" value={`${loggedCount}/${sessions.length}`} tone="green" />
          <MetricTile
            label="Racemål"
            value={raceTarget ? `${Math.round(raceTarget)} g/h` : '-'}
            tone="blue"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Progression mot racenivå
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {latestPlan?.name ?? 'Senaste fuelingplan'} {nextSession ? `- nästa fokus: ${Math.round(nextSession.prescription.targetCarbsGPerHour)} g/h` : ''}
              </p>
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

        <div className="space-y-3">
          {sessions.map((session) => (
            <FuelingSessionRow key={session.workout.id} session={session} />
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
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

function FuelingSessionRow({ session }: { session: FuelingSession }) {
  const prescription = session.prescription
  const log = session.log
  const actual = log?.actualCarbsGPerHour ?? null
  const target = prescription.targetCarbsGPerHour
  const targetLabel = `${Math.round(target)} g/h`
  const totalLabel = prescription.targetCarbsTotalG ? `${Math.round(prescription.targetCarbsTotalG)} g totalt` : null
  const dateLabel = session.date ? format(new Date(session.date), 'd MMM', { locale: sv }) : `Dag ${session.dayNumber}`

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-950/30 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-slate-300 text-slate-600 dark:border-white/20 dark:text-slate-300">
            Vecka {session.weekNumber} · {dateLabel}
          </Badge>
          {log && (
            <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Loggad
            </Badge>
          )}
        </div>
        <div>
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{session.workout.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {session.workout.duration ? `${session.workout.duration} min` : 'Tid saknas'}
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
            {Math.round(actual)} g/h faktiskt
          </div>
        )}
        {log?.stomachRating != null && (
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
            Mage {log.stomachRating}/5
          </div>
        )}
      </div>
    </div>
  )
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
