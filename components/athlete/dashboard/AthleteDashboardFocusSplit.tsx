import Link from 'next/link'
import { Activity, ArrowRight, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AthleteDashboardFocusSplitProps {
  basePath: string
  locale: 'en' | 'sv'
  showTrainingDetails: boolean
}

function label(locale: 'en' | 'sv', en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export function AthleteDashboardFocusSplit({
  basePath,
  locale,
  showTrainingDetails,
}: AthleteDashboardFocusSplitProps) {
  const dashboardHref = `${basePath}/athlete/dashboard`
  const trainingHref = `${dashboardHref}?details=training#training-details`
  const nutritionHref = `${basePath}/athlete/nutrition`

  return (
    <section className="mb-8" aria-label={label(locale, 'Dashboard focus', 'Dashboardfokus')}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href={trainingHref}
          className={cn(
            'group flex min-h-[92px] items-center justify-between rounded-lg border px-4 py-3 transition',
            showTrainingDetails
              ? 'border-orange-400/50 bg-orange-500/10 text-orange-950 dark:text-orange-100'
              : 'border-slate-200 bg-white/70 text-slate-800 hover:border-orange-300 hover:bg-orange-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-orange-400/40 dark:hover:bg-orange-500/10'
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-300">
              <Activity className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {label(locale, 'Training details', 'Träningsdetaljer')}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {showTrainingDetails
                  ? label(locale, 'Detailed training view is loaded', 'Detaljerad träningsvy är laddad')
                  : label(locale, 'Load plans, trends, history and analysis', 'Ladda planer, trender, historik och analys')}
              </span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
        </Link>

        <Link
          href={nutritionHref}
          className="group flex min-h-[92px] items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-4 py-3 text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Utensils className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {label(locale, 'Nutrition', 'Kost')}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {label(locale, 'Meal guide, recipes and food logging', 'Måltidsguide, recept och matloggning')}
              </span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      {showTrainingDetails && (
        <div className="mt-3 flex justify-end">
          <Link
            href={dashboardHref}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            {label(locale, 'Back to compact overview', 'Tillbaka till kompakt översikt')}
          </Link>
        </div>
      )}
    </section>
  )
}
