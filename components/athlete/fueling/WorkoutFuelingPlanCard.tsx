import type { ReactNode } from 'react'
import { CheckCircle2, Circle, Droplets, FlaskConical, Utensils } from 'lucide-react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import {
  normalizeRaceFuelingProductItems,
  summarizeRaceFuelingProductItems,
} from '@/lib/fueling/product-plan'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { useLocale } from '@/i18n/client'

type WorkoutFuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
  instructionsSv?: string | null
  plan?: {
    name?: string | null
    sport?: string | null
    distanceKm?: number | null
    targetSpeedKmh?: number | null
    targetPowerWatts?: number | null
    targetPaceMinKm?: number | null
    recommendedCarbsGPerHour?: number | null
  } | null
}

type WorkoutFuelingLog = {
  actualCarbsGPerHour?: number | null
  actualCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
  productsUsed?: unknown
  stomachRating?: number | null
  energyRating?: number | null
  notes?: string | null
}

interface WorkoutFuelingPlanCardProps {
  prescription?: WorkoutFuelingPrescription | null
  log?: WorkoutFuelingLog | null
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function WorkoutFuelingPlanCard({ prescription, log }: WorkoutFuelingPlanCardProps) {
  const locale = getAppLocale(useLocale())

  if (!prescription) return null

  const targetHourly = Math.round(prescription.targetCarbsGPerHour)
  const targetTotal = prescription.targetCarbsTotalG ? Math.round(prescription.targetCarbsTotalG) : null
  const actualHourly = log?.actualCarbsGPerHour != null ? Math.round(log.actualCarbsGPerHour) : null
  const actualTotal = log?.actualCarbsTotalG != null ? Math.round(log.actualCarbsTotalG) : null
  const productsUsed = normalizeRaceFuelingProductItems(log?.productsUsed)
  const raceTarget = prescription.plan?.recommendedCarbsGPerHour
    ? Math.round(prescription.plan.recommendedCarbsGPerHour)
    : null
  const inferredDurationMinutes = targetTotal
    ? Math.round((targetTotal / targetHourly) * 60)
    : null
  const executionPlan = buildRaceDayFuelingPlan(targetHourly, inferredDurationMinutes, locale)
  const planContext = formatFuelingPlanContext(prescription.plan, { includeName: true, locale })

  return (
    <GlassCard className="mb-8 border-orange-200 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/5 transition-colors">
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <GlassCardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              {text(locale, 'Energi för passet', 'Session fueling')}
            </GlassCardTitle>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {text(locale, 'Träna magen och energiintaget som en del av själva passet.', 'Train your gut and energy intake as part of the session itself.')}
            </p>
            {planContext && (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {planContext}
              </p>
            )}
          </div>
          {log && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {text(locale, 'Loggad', 'Logged')}
            </div>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FuelingMetric
            icon={<Utensils className="h-4 w-4" />}
            label={text(locale, 'Planerat intag', 'Planned intake')}
            value={`${targetHourly} g/h`}
            detail={targetTotal ? `${targetTotal} g ${text(locale, 'totalt', 'total')}` : undefined}
          />
          <FuelingMetric
            icon={<Droplets className="h-4 w-4" />}
            label={text(locale, 'Vätska', 'Fluid')}
            value={prescription.hydrationMl ? `${prescription.hydrationMl} ml` : text(locale, 'Ej satt', 'Not set')}
          />
          <FuelingMetric
            icon={<Circle className="h-4 w-4" />}
            label={text(locale, 'Natrium', 'Sodium')}
            value={prescription.sodiumMg ? `${prescription.sodiumMg} mg` : text(locale, 'Ej satt', 'Not set')}
          />
          <FuelingMetric
            icon={<FlaskConical className="h-4 w-4" />}
            label={text(locale, 'Racemål', 'Race target')}
            value={raceTarget ? `${raceTarget} g/h` : text(locale, 'Ej satt', 'Not set')}
            detail={prescription.plan?.name ?? undefined}
          />
        </div>

        {prescription.instructionsSv && (
          <div className="rounded-2xl border border-orange-200 bg-white/70 p-4 dark:border-orange-500/20 dark:bg-slate-950/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
              {text(locale, 'Instruktion', 'Instruction')}
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              {prescription.instructionsSv}
            </p>
          </div>
        )}

        {executionPlan && (
          <div className="rounded-2xl border border-orange-200 bg-white/70 p-4 dark:border-orange-500/20 dark:bg-slate-950/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                  {text(locale, 'Genomförande', 'Execution')}
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                  {text(locale, 'Ta cirka', 'Take around')} {executionPlan.intakeEvery20Min} g {text(locale, 'kolhydrater var 20:e minut under den tävlingslika delen.', 'carbohydrates every 20 minutes during the race-like part.')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right sm:min-w-52">
                <ExecutionMetric label="Gel" value={executionPlan.gelEquivalentCount ? `${executionPlan.gelEquivalentCount} ${text(locale, 'st', 'pcs')}` : '-'} />
                <ExecutionMetric label={text(locale, 'Flaska', 'Bottle')} value={executionPlan.bottleMixCount ? `${executionPlan.bottleMixCount} ${text(locale, 'st', 'pcs')}` : '-'} />
              </div>
            </div>

            {executionPlan.timing.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {executionPlan.timing.slice(0, 6).map((point) => (
                  <div
                    key={point.minute}
                    className="min-w-20 rounded-xl bg-orange-50 px-3 py-2 text-center dark:bg-orange-500/10"
                  >
                    <p className="text-[10px] font-black text-orange-700 dark:text-orange-300">{point.label}</p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{point.carbs} g</p>
                  </div>
                ))}
              </div>
            )}

            {executionPlan.notesSv.length > 0 && (
              <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {raceDayNote(executionPlan.notesSv[executionPlan.carbsPerHour > 60 ? 2 : 0], locale)}
              </p>
            )}
          </div>
        )}

        {log && (
          <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5 sm:grid-cols-4">
            <CompletedMetric label={text(locale, 'Faktiskt intag', 'Actual intake')} value={actualHourly ? `${actualHourly} g/h` : '-'} detail={actualTotal ? `${actualTotal} g ${text(locale, 'totalt', 'total')}` : undefined} />
            <CompletedMetric label={text(locale, 'Vätska', 'Fluid')} value={log.hydrationMl ? `${log.hydrationMl} ml` : '-'} />
            <CompletedMetric label={text(locale, 'Mage', 'Gut')} value={log.stomachRating ? `${log.stomachRating}/5` : '-'} />
            <CompletedMetric label={text(locale, 'Energi', 'Energy')} value={log.energyRating ? `${log.energyRating}/5` : '-'} />
          </div>
        )}

        {productsUsed.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 dark:border-emerald-500/20 dark:bg-slate-950/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              {text(locale, 'Produkter som användes', 'Products used')}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {summarizeRaceFuelingProductItems(productsUsed)}
            </p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

function raceDayNote(note: string, locale: AppLocale): string {
  if (locale === 'sv') return note
  const notes: Record<string, string> = {
    'Testa alltid planen på långpass innan tävling.': 'Always test the plan during long sessions before race day.',
    'Drick efter törst och väder, men undvik att skölja ned stora kolhydratdoser utan vätska.': 'Drink according to thirst and weather, but avoid taking large carbohydrate doses without fluid.',
    'Vid över 60 g/timme bör produkterna innehålla flera kolhydrattyper, till exempel glukos/fruktos.': 'Above 60 g/hour, products should include multiple carbohydrate types, such as glucose/fructose.',
    'För lopp över tre timmar: planera även salt/vätska separat utifrån värme och svettförlust.': 'For races over three hours, also plan sodium/fluid separately based on heat and sweat loss.',
  }
  return notes[note] ?? note
}

function ExecutionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-orange-50 px-3 py-2 dark:bg-orange-500/10">
      <p className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function FuelingMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-white/70 p-4 dark:border-orange-500/20 dark:bg-slate-950/30">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</p>
      {detail && <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  )
}

function CompletedMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</p>
      {detail && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  )
}
