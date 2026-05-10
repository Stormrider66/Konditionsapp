import type { ReactNode } from 'react'
import { CheckCircle2, Circle, Droplets, FlaskConical, Utensils } from 'lucide-react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'

type WorkoutFuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
  instructionsSv?: string | null
  plan?: {
    name?: string | null
    recommendedCarbsGPerHour?: number | null
  } | null
}

type WorkoutFuelingLog = {
  actualCarbsGPerHour?: number | null
  actualCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
  stomachRating?: number | null
  energyRating?: number | null
  notes?: string | null
}

interface WorkoutFuelingPlanCardProps {
  prescription?: WorkoutFuelingPrescription | null
  log?: WorkoutFuelingLog | null
}

export function WorkoutFuelingPlanCard({ prescription, log }: WorkoutFuelingPlanCardProps) {
  if (!prescription) return null

  const targetHourly = Math.round(prescription.targetCarbsGPerHour)
  const targetTotal = prescription.targetCarbsTotalG ? Math.round(prescription.targetCarbsTotalG) : null
  const actualHourly = log?.actualCarbsGPerHour != null ? Math.round(log.actualCarbsGPerHour) : null
  const actualTotal = log?.actualCarbsTotalG != null ? Math.round(log.actualCarbsTotalG) : null
  const raceTarget = prescription.plan?.recommendedCarbsGPerHour
    ? Math.round(prescription.plan.recommendedCarbsGPerHour)
    : null

  return (
    <GlassCard className="mb-8 border-orange-200 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/5 transition-colors">
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <GlassCardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Energi för passet
            </GlassCardTitle>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Träna magen och energiintaget som en del av själva passet.
            </p>
          </div>
          {log && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Loggad
            </div>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FuelingMetric
            icon={<Utensils className="h-4 w-4" />}
            label="Planerat intag"
            value={`${targetHourly} g/h`}
            detail={targetTotal ? `${targetTotal} g totalt` : undefined}
          />
          <FuelingMetric
            icon={<Droplets className="h-4 w-4" />}
            label="Vätska"
            value={prescription.hydrationMl ? `${prescription.hydrationMl} ml` : 'Ej satt'}
          />
          <FuelingMetric
            icon={<Circle className="h-4 w-4" />}
            label="Natrium"
            value={prescription.sodiumMg ? `${prescription.sodiumMg} mg` : 'Ej satt'}
          />
          <FuelingMetric
            icon={<FlaskConical className="h-4 w-4" />}
            label="Racemål"
            value={raceTarget ? `${raceTarget} g/h` : 'Ej satt'}
            detail={prescription.plan?.name ?? undefined}
          />
        </div>

        {prescription.instructionsSv && (
          <div className="rounded-2xl border border-orange-200 bg-white/70 p-4 dark:border-orange-500/20 dark:bg-slate-950/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
              Instruktion
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              {prescription.instructionsSv}
            </p>
          </div>
        )}

        {log && (
          <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5 sm:grid-cols-4">
            <CompletedMetric label="Faktiskt intag" value={actualHourly ? `${actualHourly} g/h` : '-'} detail={actualTotal ? `${actualTotal} g totalt` : undefined} />
            <CompletedMetric label="Vätska" value={log.hydrationMl ? `${log.hydrationMl} ml` : '-'} />
            <CompletedMetric label="Mage" value={log.stomachRating ? `${log.stomachRating}/5` : '-'} />
            <CompletedMetric label="Energi" value={log.energyRating ? `${log.energyRating}/5` : '-'} />
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
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
