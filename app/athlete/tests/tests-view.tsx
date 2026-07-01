// app/athlete/tests/tests-view.tsx
//
// Shared tests list rendered by BOTH the solo route (app/athlete/tests) and
// the business route (app/(business)/[businessSlug]/athlete/tests).
// Auth is resolved by the page wrappers.
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAthleteTestsHref } from '@/lib/athlete-tests/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Activity,
  Heart,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getLocale, getTranslations } from '@/i18n/server'

export interface AthleteTestsViewProps {
  clientId: string
  /** Empty for solo athletes; the business slug path prefix otherwise. */
  basePath: string
}

export async function AthleteTestsView({ clientId, basePath }: AthleteTestsViewProps) {
  const t = await getTranslations('athletePages.tests')
  const locale = await getLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const sportProfile = await prisma.sportProfile.findUnique({
    where: { clientId },
    select: { primarySport: true, secondarySports: true },
  })
  const sportAwareHref = getAthleteTestsHref(basePath, sportProfile)
  if (sportAwareHref !== `${basePath}/athlete/tests`) {
    redirect(sportAwareHref)
  }

  // Fetch all tests for this client
  const tests = await prisma.test.findMany({
    where: {
      clientId: clientId,
      status: 'COMPLETED',
    },
    orderBy: {
      testDate: 'desc',
    },
  })

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10 transition-colors" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100/40 dark:bg-orange-600/10 rounded-full blur-[120px] -z-10 transition-colors" />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="ghost" className="mb-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 group transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {t('backToDashboard')}
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 border border-orange-200 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold italic uppercase tracking-tight mb-1 text-slate-900 dark:text-white transition-colors">
                {t('titlePrefix')} <span className="text-orange-600 dark:text-orange-500 transition-colors">{t('titleAccent')}</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">
                {t('description')}
              </p>
            </div>
          </div>
        </div>

        {/* Test Stats */}
        {tests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
              <GlassCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                    {t('stats.totalTests')}
                  </GlassCardDescription>
                  <Activity className="h-4 w-4 text-blue-600/50 dark:text-blue-400/50 transition-colors" />
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-4xl font-black text-slate-900 dark:text-white transition-colors">{tests.length}</div>
              </GlassCardContent>
            </GlassCard>

            {tests[0]?.vo2max && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 overflow-hidden relative group transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 blur-2xl group-hover:bg-orange-100 dark:bg-orange-600/5 dark:group-hover:bg-orange-600/10 transition-colors" />
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      {t('stats.latestVo2max')}
                    </GlassCardDescription>
                    <Zap className="h-4 w-4 text-orange-500/50 dark:text-orange-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-orange-500 dark:text-orange-400 transition-colors">{tests[0].vo2max.toFixed(1)}</div>
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase transition-colors">ml/kg/min</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {tests[0]?.maxHR && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      {t('stats.maxHeartRate')}
                    </GlassCardDescription>
                    <Heart className="h-4 w-4 text-pink-500/50 dark:text-pink-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-slate-900 dark:text-white transition-colors">{tests[0].maxHR}</div>
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase transition-colors">bpm</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {tests.length > 1 && tests[0]?.vo2max && tests[1]?.vo2max && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      {t('stats.improvement')}
                    </GlassCardDescription>
                    <TrendingUp className="h-4 w-4 text-green-500/50 dark:text-green-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className={cn(
                      "text-4xl font-black transition-colors",
                      tests[0].vo2max - tests[1].vo2max >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {tests[0].vo2max - tests[1].vo2max > 0 ? '+' : ''}
                      {(tests[0].vo2max - tests[1].vo2max).toFixed(1)}
                    </div>
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase transition-colors">ml/kg/min</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tests Table */}
          <div className="lg:col-span-2 space-y-8">
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white transition-colors">{t('table.title')}</GlassCardTitle>
                <GlassCardDescription className="text-slate-500 dark:text-slate-500 transition-colors">
                  {t('table.description')}
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {tests.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/[0.02] dark:border-white/10 rounded-2xl transition-colors">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700 transition-colors" />
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">{t('table.empty')}</p>
                  </div>
                ) : (
                  <div className="overflow-hidden bg-white border border-slate-200 dark:bg-white/[0.02] dark:border-white/5 rounded-2xl transition-colors">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-white/5 dark:border-white/5 transition-colors">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 transition-colors">{t('table.date')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 transition-colors">{t('table.type')}</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 text-center transition-colors">VO2max</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 text-right transition-colors">{t('table.action')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((test) => (
                          <TableRow key={test.id} className="hover:bg-slate-50 border-slate-100 dark:hover:bg-white/5 dark:border-white/5 group transition-colors">
                            <TableCell className="py-4">
                              <span className="font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                {format(new Date(test.testDate), 'd MMMM yyyy', { locale: dateLocale })}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 text-[10px] font-black uppercase tracking-tight dark:text-blue-400 py-0.5 transition-colors">
                                {formatTestType(test.testType, t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span className="text-lg font-black text-slate-900 dark:text-white transition-colors">
                                {test.vo2max ? `${test.vo2max.toFixed(1)}` : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Link href={`${basePath}/athlete/tests/${test.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-blue-600 dark:hover:text-white transition-all">
                                  {t('table.viewReport')}
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* VO2max Progress Chart - if multiple tests */}
          <div className="lg:col-span-1">
            {tests.length > 1 && tests.some((t) => t.vo2max) && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 h-full transition-colors">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white transition-colors">{t('chart.title')}</GlassCardTitle>
                  <GlassCardDescription className="text-slate-500 dark:text-slate-500 transition-colors">
                    {t('chart.description')}
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="h-[400px] flex items-end gap-3 pt-10 pb-2">
                    {tests
                      .slice()
                      .reverse()
                      .filter((t) => t.vo2max)
                      .map((test) => {
                        const maxVo2 = Math.max(
                          ...tests.filter((t) => t.vo2max).map((t) => t.vo2max!)
                        )
                        const minVo2 = Math.min(
                          ...tests.filter((t) => t.vo2max).map((t) => t.vo2max!)
                        )
                        // Scale height between 20% and 100% to ensure visibility
                        const range = maxVo2 - minVo2
                        const normalizedHeight = range > 0
                          ? 20 + ((test.vo2max! - minVo2) / range) * 80
                          : 80

                        return (
                          <div key={test.id} className="flex-1 flex flex-col items-center group">
                            <div className="relative w-full flex flex-col items-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-blue-600 text-[10px] font-black px-2 py-1 rounded shadow-lg z-50 text-white">
                                {test.vo2max!.toFixed(1)}
                              </div>
                              <div
                                className="w-full bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 rounded-t-lg transition-all group-hover:from-blue-400 group-hover:to-blue-200 dark:group-hover:from-blue-500 dark:group-hover:to-blue-300 shadow-lg shadow-blue-500/10"
                                style={{ height: `${normalizedHeight}%`, minHeight: '40px' }}
                              />
                            </div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 mt-3 rotate-45 origin-left whitespace-nowrap transition-colors">
                              {format(new Date(test.testDate), 'MMM yy', { locale: dateLocale })}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between transition-colors">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 transition-colors">{t('chart.highest')}</p>
                      <p className="text-xl font-black text-blue-600 dark:text-blue-400 transition-colors">
                        {Math.max(...tests.filter(t => t.vo2max).map(t => t.vo2max!)).toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 transition-colors">{t('chart.lowest')}</p>
                      <p className="text-xl font-black text-slate-400 dark:text-slate-500 transition-colors">
                        {Math.min(...tests.filter(t => t.vo2max).map(t => t.vo2max!)).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatTestType(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'RUNNING': return t('testTypes.running')
    case 'CYCLING': return t('testTypes.cycling')
    case 'SKIING': return t('testTypes.skiing')
    default: return type
  }
}
