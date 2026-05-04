// app/(business)/[businessSlug]/athlete/tests/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
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
  Shield,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface BusinessTestsPageProps {
  params: Promise<{ businessSlug: string }>
}

interface AthleteTestRow {
  id: string
  kind: 'LAB' | 'HOCKEY'
  date: Date
  label: string
  summary: string | null
  vo2max: number | null
  maxHR: number | null
  href: string
}

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

function speedKmh(distanceM: number, timeS: number | null | undefined): number | null {
  if (timeS == null || timeS <= 0) return null
  return Math.round((distanceM / timeS) * 3.6 * 10) / 10
}

function formatHockeySummary(test: {
  muscleLabMaxima: unknown
  backSquat1RM: number | null
  powerClean1RM: number | null
  standingLongJump: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  agility505Left: number | null
  agility505Right: number | null
  endurance7x40: unknown
  vo2max: number | null
  lt2SpeedKmh: number | null
  maxLactate: number | null
}): string | null {
  const parts: string[] = []
  const muscleLabWkg = numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass')
  const agilityBest = bestOf([test.agility505Left, test.agility505Right], true)
  const enduranceTimes = Array.isArray(test.endurance7x40)
    ? test.endurance7x40.filter((time): time is number => typeof time === 'number' && Number.isFinite(time) && time > 0)
    : []
  const enduranceAverageKmh = enduranceTimes.length
    ? enduranceTimes.reduce((sum, time) => sum + speedKmh(40, time)!, 0) / enduranceTimes.length
    : null

  if (muscleLabWkg != null) parts.push(`MuscleLab ${muscleLabWkg.toFixed(1)} W/kg`)
  if (test.sprint10m != null) parts.push(`10m ${test.sprint10m.toFixed(2)} s`)
  if (test.sprint30m != null) parts.push(`30m ${test.sprint30m.toFixed(2)} s`)
  if (enduranceAverageKmh != null) parts.push(`7x40 ${enduranceAverageKmh.toFixed(1)} km/h`)
  if (test.vo2max != null) parts.push(`VO2max ${test.vo2max.toFixed(1)}`)
  if (test.lt2SpeedKmh != null) parts.push(`LT2 ${test.lt2SpeedKmh.toFixed(1)} km/h`)
  if (test.maxLactate != null) parts.push(`Laktat ${test.maxLactate.toFixed(1)}`)
  if (test.backSquat1RM != null) parts.push(`Knäböj ${test.backSquat1RM.toFixed(0)} kg`)
  if (test.powerClean1RM != null) parts.push(`PC ${test.powerClean1RM.toFixed(0)} kg`)
  if (test.standingLongJump != null) parts.push(`SLJ ${test.standingLongJump.toFixed(0)} cm`)
  if (agilityBest != null) parts.push(`5-10-5 ${agilityBest.toFixed(2)} s`)

  return parts.length > 0 ? parts.slice(0, 4).join(' · ') : null
}

export default async function BusinessAthleteTestsPage({ params }: BusinessTestsPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Fetch all test sources the athlete should be able to review.
  const [tests, hockeyTests] = await Promise.all([
    prisma.test.findMany({
      where: {
        clientId: clientId,
        status: 'COMPLETED',
      },
      orderBy: {
        testDate: 'desc',
      },
    }),
    prisma.hockeyPhysicalTest.findMany({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      select: {
        id: true,
        testDate: true,
        sourceType: true,
        muscleLabMaxima: true,
        backSquat1RM: true,
        powerClean1RM: true,
        standingLongJump: true,
        sprint10m: true,
        sprint20m: true,
        sprint30m: true,
        agility505Left: true,
        agility505Right: true,
        endurance7x40: true,
        vo2max: true,
        lt2SpeedKmh: true,
        maxHeartRate: true,
        maxLactate: true,
      },
    }),
  ])

  const testRows: AthleteTestRow[] = [
    ...tests.map((test) => ({
      id: test.id,
      kind: 'LAB' as const,
      date: test.testDate,
      label: formatTestType(test.testType),
      summary: test.vo2max != null
        ? `VO2max ${test.vo2max.toFixed(1)} ml/kg/min${test.maxHR != null ? ` · Max HR ${test.maxHR} bpm` : ''}`
        : test.maxHR != null
          ? `Max HR ${test.maxHR} bpm`
          : null,
      vo2max: test.vo2max,
      maxHR: test.maxHR,
      href: `${basePath}/athlete/tests/${test.id}`,
    })),
    ...hockeyTests.map((test) => ({
      id: test.id,
      kind: 'HOCKEY' as const,
      date: test.testDate,
      label: test.sourceType === 'MUSCLE_LAB_IMPORT' ? 'Hockey/MuscleLab' : 'Hockeybatteri',
      summary: formatHockeySummary(test),
      vo2max: test.vo2max,
      maxHR: test.maxHeartRate,
      href: `${basePath}/athlete/profile?tab=hockey`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const rowsWithVo2 = testRows.filter((test) => test.vo2max != null)
  const latestVo2 = rowsWithVo2[0]?.vo2max ?? null
  const previousVo2 = rowsWithVo2[1]?.vo2max ?? null
  const latestMaxHR = testRows.find((test) => test.maxHR != null)?.maxHR ?? null

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10 transition-colors" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100/40 dark:bg-orange-600/10 rounded-full blur-[120px] -z-10 transition-colors" />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="ghost" className="mb-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 group transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            TILLBAKA TILL DASHBOARD
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 rounded-2xl shadow-xl shadow-blue-500/5 transition-colors">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-1 text-slate-900 dark:text-white transition-colors">
                Mina <span className="text-blue-600 dark:text-blue-400 transition-colors">Tester</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">
                Översikt över labbtester, hockeybatterier och utveckling över tid
              </p>
            </div>
          </div>
        </div>

        {/* Test Stats */}
        {testRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
              <GlassCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                    Totalt tester
                  </GlassCardDescription>
                  <Activity className="h-4 w-4 text-blue-600/50 dark:text-blue-400/50 transition-colors" />
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-4xl font-black text-slate-900 dark:text-white transition-colors">{testRows.length}</div>
              </GlassCardContent>
            </GlassCard>

            {latestVo2 != null && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 overflow-hidden relative group transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 blur-2xl group-hover:bg-orange-100 dark:bg-orange-600/5 dark:group-hover:bg-orange-600/10 transition-colors" />
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      Senaste VO2max
                    </GlassCardDescription>
                    <Zap className="h-4 w-4 text-orange-500/50 dark:text-orange-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-orange-500 dark:text-orange-400 transition-colors">{latestVo2.toFixed(1)}</div>
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase transition-colors">ml/kg/min</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {latestMaxHR != null && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      Max Puls
                    </GlassCardDescription>
                    <Heart className="h-4 w-4 text-pink-500/50 dark:text-pink-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-slate-900 dark:text-white transition-colors">{latestMaxHR}</div>
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase transition-colors">bpm</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {latestVo2 != null && previousVo2 != null && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 transition-colors">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
                      Förbättring
                    </GlassCardDescription>
                    <TrendingUp className="h-4 w-4 text-green-500/50 dark:text-green-400/50 transition-colors" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className={cn(
                      "text-4xl font-black transition-colors",
                      latestVo2 - previousVo2 >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {latestVo2 - previousVo2 > 0 ? '+' : ''}
                      {(latestVo2 - previousVo2).toFixed(1)}
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
                <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white transition-colors">Alla Tester</GlassCardTitle>
                <GlassCardDescription className="text-slate-500 dark:text-slate-500 transition-colors">
                  Klicka på ett test för att se detaljerad rapport
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {testRows.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/[0.02] dark:border-white/10 rounded-2xl transition-colors">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700 transition-colors" />
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">Inga tester genomförda ännu</p>
                  </div>
                ) : (
                  <div className="overflow-hidden bg-white border border-slate-200 dark:bg-white/[0.02] dark:border-white/5 rounded-2xl transition-colors">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-white/5 dark:border-white/5 transition-colors">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 transition-colors">Datum</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 transition-colors">Typ</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 transition-colors">Resultat</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 py-4 text-right transition-colors">Åtgärd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testRows.map((test) => (
                          <TableRow key={test.id} className="hover:bg-slate-50 border-slate-100 dark:hover:bg-white/5 dark:border-white/5 group transition-colors">
                            <TableCell className="py-4">
                              <span className="font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                {format(test.date, 'd MMMM yyyy', { locale: sv })}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 text-[10px] font-black uppercase tracking-tight dark:text-blue-400 py-0.5 transition-colors">
                                {test.kind === 'HOCKEY' && <Shield className="mr-1 h-3 w-3" />}
                                {test.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                                {test.summary ?? '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Link href={test.href}>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-blue-600 dark:hover:text-white transition-all">
                                  {test.kind === 'HOCKEY' ? 'Visa Hockey' : 'Visa Rapport'}
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
            {rowsWithVo2.length > 1 && (
              <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/50 h-full transition-colors">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white transition-colors">Utveckling</GlassCardTitle>
                  <GlassCardDescription className="text-slate-500 dark:text-slate-500 transition-colors">
                    Din VO2max-progression över tid
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="h-[400px] flex items-end gap-3 pt-10 pb-2">
                    {rowsWithVo2
                      .slice()
                      .reverse()
                      .map((test) => {
                        const maxVo2 = Math.max(
                          ...rowsWithVo2.map((t) => t.vo2max!)
                        )
                        const minVo2 = Math.min(
                          ...rowsWithVo2.map((t) => t.vo2max!)
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
                              {format(test.date, 'MMM yy', { locale: sv })}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between transition-colors">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 transition-colors">Högsta värde</p>
                      <p className="text-xl font-black text-blue-600 dark:text-blue-400 transition-colors">
                        {Math.max(...rowsWithVo2.map(t => t.vo2max!)).toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 transition-colors">Lägsta värde</p>
                      <p className="text-xl font-black text-slate-400 dark:text-slate-500 transition-colors">
                        {Math.min(...rowsWithVo2.map(t => t.vo2max!)).toFixed(1)}
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
function formatTestType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidåkning',
  }
  return types[type] || type
}
