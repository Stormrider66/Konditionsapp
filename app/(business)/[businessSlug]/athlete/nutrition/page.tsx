import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { NutritionStatsPage } from '@/components/nutrition/NutritionStatsPage'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Utensils } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from '@/i18n/server'

interface BusinessNutritionPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessNutritionPage({ params }: BusinessNutritionPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athletePages.nutrition.stats')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-cyan-500/30 dark:bg-[#050505] dark:text-slate-200">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-6xl relative z-10">
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full px-4 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            {t('backToDashboard')}
          </Button>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Utensils className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-950 leading-none dark:text-white">
              {t('title')}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <NutritionDashboard clientId={clientId} />

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                {t('statsTitle')}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('statsSubtitle')}
              </p>
            </div>
            <NutritionStatsPage clientId={clientId} basePath={basePath} />
          </section>
        </div>
      </div>
    </div>
  )
}
