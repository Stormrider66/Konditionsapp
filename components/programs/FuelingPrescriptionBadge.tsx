import { CheckCircle2, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

type FuelingPrescription = {
  targetCarbsGPerHour: number
  targetCarbsTotalG?: number | null
  hydrationMl?: number | null
  sodiumMg?: number | null
}

type FuelingLog = {
  actualCarbsGPerHour?: number | null
  stomachRating?: number | null
}

interface FuelingPrescriptionBadgeProps {
  prescription?: FuelingPrescription | null
  log?: FuelingLog | null
  compact?: boolean
  className?: string
}

export function FuelingPrescriptionBadge({
  prescription,
  log,
  compact = false,
  className,
}: FuelingPrescriptionBadgeProps) {
  if (!prescription) return null

  const target = Math.round(prescription.targetCarbsGPerHour)
  const total = prescription.targetCarbsTotalG ? Math.round(prescription.targetCarbsTotalG) : null
  const actual = log?.actualCarbsGPerHour != null ? Math.round(log.actualCarbsGPerHour) : null
  const stomach = log?.stomachRating ?? null

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300',
          className
        )}
      >
        <Utensils className="h-3 w-3" />
        {target} g/h
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-xs text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200',
        className
      )}
    >
      <span className="inline-flex items-center gap-1 font-black uppercase tracking-widest">
        <Utensils className="h-3.5 w-3.5" />
        {target} g/h
      </span>
      {total && <span className="font-bold">{total} g totalt</span>}
      {actual != null && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          {actual} g/h faktiskt
        </span>
      )}
      {stomach != null && (
        <span className="font-bold text-slate-700 dark:text-slate-200">
          Mage {stomach}/5
        </span>
      )}
    </div>
  )
}
