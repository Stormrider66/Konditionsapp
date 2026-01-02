import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
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
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default async function AthleteTestsPage() {
  const user = await requireAthlete()

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: true,
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch all tests for this client
  const tests = await prisma.test.findMany({
    where: {
      clientId: athleteAccount.clientId,
      status: 'COMPLETED',
    },
    orderBy: {
      testDate: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        <Link href="/athlete/dashboard">
          <Button variant="ghost" className="mb-8 text-slate-400 hover:text-white hover:bg-white/5 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            TILLBAKA TILL DASHBOARD
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-xl shadow-blue-500/5">
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1">
                Mina <span className="text-blue-400">Konditionstester</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Översikt över alla dina genomförda konditionstester och resultat
              </p>
            </div>
          </div>
        </div>

        {/* Test Stats */}
        {tests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard className="border-white/5 shadow-xl shadow-black/50">
              <GlassCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Totalt tester
                  </GlassCardDescription>
                  <Activity className="h-4 w-4 text-blue-400/50" />
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-4xl font-black text-white">{tests.length}</div>
              </GlassCardContent>
            </GlassCard>

            {tests[0]?.vo2max && (
              <GlassCard className="border-white/5 shadow-xl shadow-black/50 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 blur-2xl group-hover:bg-orange-600/10 transition-colors" />
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Senaste VO2max
                    </GlassCardDescription>
                    <Zap className="h-4 w-4 text-orange-400/50" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-orange-400">{tests[0].vo2max.toFixed(1)}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase">ml/kg/min</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {tests[0]?.maxHR && (
              <GlassCard className="border-white/5 shadow-xl shadow-black/50">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Max Puls
                    </GlassCardDescription>
                    <Heart className="h-4 w-4 text-pink-400/50" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black text-white">{tests[0].maxHR}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase">bpm</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {tests.length > 1 && tests[0]?.vo2max && tests[1]?.vo2max && (
              <GlassCard className="border-white/5 shadow-xl shadow-black/50">
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Förbättring
                    </GlassCardDescription>
                    <TrendingUp className="h-4 w-4 text-green-400/50" />
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-baseline gap-1">
                    <div className={cn(
                      "text-4xl font-black",
                      tests[0].vo2max - tests[1].vo2max >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {tests[0].vo2max - tests[1].vo2max > 0 ? '+' : ''}
                      {(tests[0].vo2max - tests[1].vo2max).toFixed(1)}
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase">ml/kg/min</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tests Table */}
          <div className="lg:col-span-2 space-y-8">
            <GlassCard className="border-white/5 shadow-xl shadow-black/50">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight">Alla Tester</GlassCardTitle>
                <GlassCardDescription className="text-slate-500">
                  Klicka på ett test för att se detaljerad rapport
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {tests.length === 0 ? (
                  <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest">Inga tester genomförda ännu</p>
                  </div>
                ) : (
                  <div className="overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl">
                    <Table>
                      <TableHeader className="bg-white/5 border-b border-white/5">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Datum</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Typ</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 text-center">VO2max</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 text-right">Åtgärd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((test) => (
                          <TableRow key={test.id} className="hover:bg-white/5 border-white/5 group transition-colors">
                            <TableCell className="py-4">
                              <span className="font-bold text-slate-200">
                                {format(new Date(test.testDate), 'd MMMM yyyy', { locale: sv })}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-tight text-blue-400 py-0.5">
                                {formatTestType(test.testType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span className="text-lg font-black text-white">
                                {test.vo2max ? `${test.vo2max.toFixed(1)}` : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Link href={`/athlete/tests/${test.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-blue-600 hover:text-white transition-all">
                                  Visa Rapport
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
              <GlassCard className="border-white/5 shadow-xl shadow-black/50 h-full">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight">Utveckling</GlassCardTitle>
                  <GlassCardDescription className="text-slate-500">
                    Din VO2max-progression över tid
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="h-[400px] flex items-end gap-3 pt-10 pb-2">
                    {tests
                      .slice()
                      .reverse()
                      .filter((t) => t.vo2max)
                      .map((test, index) => {
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
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-blue-600 text-[10px] font-black px-2 py-1 rounded shadow-lg z-50">
                                {test.vo2max!.toFixed(1)}
                              </div>
                              <div
                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all group-hover:from-blue-500 group-hover:to-blue-300 shadow-lg shadow-blue-500/10"
                                style={{ height: `${normalizedHeight}%`, minHeight: '40px' }}
                              />
                            </div>
                            <div className="text-[10px] font-black text-slate-600 mt-3 rotate-45 origin-left whitespace-nowrap">
                              {format(new Date(test.testDate), 'MMM yy', { locale: sv })}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Högsta värde</p>
                      <p className="text-xl font-black text-blue-400">
                        {Math.max(...tests.filter(t => t.vo2max).map(t => t.vo2max!)).toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Lägsta värde</p>
                      <p className="text-xl font-black text-slate-400">
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
function formatTestType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidåkning',
  }
  return types[type] || type
}

