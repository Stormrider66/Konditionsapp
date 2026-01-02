// app/athlete/history/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, format } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Download,
  ArrowLeft,
  Filter,
  Trophy,
} from 'lucide-react'
import { WorkoutHistoryCharts } from '@/components/athlete/WorkoutHistoryCharts'
import { PersonalRecords } from '@/components/athlete/PersonalRecords'
import { ExportDataButton } from '@/components/athlete/ExportDataButton'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface HistoryPageProps {
  searchParams: Promise<{
    timeframe?: string
    type?: string
  }>
}

export default async function WorkoutHistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireAthlete()
  const params = await searchParams

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Determine timeframe
  const now = new Date()
  let startDate: Date
  const timeframe = params.timeframe || '30days'

  switch (timeframe) {
    case '7days':
      startDate = subDays(now, 7)
      break
    case '30days':
      startDate = subDays(now, 30)
      break
    case '3months':
      startDate = subMonths(now, 3)
      break
    case '6months':
      startDate = subMonths(now, 6)
      break
    case '1year':
      startDate = subMonths(now, 12)
      break
    default:
      startDate = subDays(now, 30)
  }

  // Build where clause
  const whereClause: any = {
    athleteId: user.id,
    completed: true,
    completedAt: {
      gte: startDate,
      lte: now,
    },
  }

  // Filter by workout type
  if (params.type) {
    whereClause.workout = {
      type: params.type,
    }
  }

  // Fetch workout logs
  const logs = await prisma.workoutLog.findMany({
    where: whereClause,
    include: {
      workout: {
        select: {
          id: true,
          name: true,
          type: true,
          intensity: true,
          distance: true,
          duration: true,
          day: {
            select: {
              week: {
                select: {
                  program: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  // Calculate stats
  const totalWorkouts = logs.length
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0)
  const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0)
  const avgRPE = logs.filter(log => log.perceivedEffort).length > 0
    ? (
      logs
        .filter(log => log.perceivedEffort)
        .reduce((sum, log) => sum + (log.perceivedEffort || 0), 0) /
      logs.filter(log => log.perceivedEffort).length
    ).toFixed(1)
    : '-'

  const avgPaceCalc = logs.filter(log => log.avgPace).length > 0
    ? logs.filter(log => log.avgPace)[0].avgPace
    : null

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-7xl mx-auto">
      <Link href="/athlete/dashboard">
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Tillbaka
        </Button>
      </Link>

      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
            Tränings<span className="text-blue-600">historik</span>
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            Översikt över dina genomförda träningspass och framsteg
          </p>
        </div>
        <ExportDataButton logs={logs as any} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Totalt pass
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-white">{totalWorkouts}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">
              Senaste {timeframe === '7days' ? '7 dagarna' : timeframe === '30days' ? '30 dagarna' : timeframe === '3months' ? '3 månaderna' : timeframe === '6months' ? '6 månaderna' : 'året'}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total distans
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-white">{totalDistance.toFixed(1)}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">kilometer körda</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total tid
              </span>
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Clock className="h-4 w-4 text-orange-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-white">
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">effektiv träning</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Snitt RPE
              </span>
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Zap className="h-4 w-4 text-red-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-white">{avgRPE}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">upplevd ansträngning</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="mb-8">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlassCardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-500" />
                Filtrera
              </GlassCardTitle>
              <GlassCardDescription>Välj tidsperiod och typ av träning</GlassCardDescription>
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Timeframe filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Tidsperiod</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/athlete/history?timeframe=7days">
                  <Badge variant={timeframe === '7days' ? 'default' : 'outline'}>
                    7 dagar
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=30days">
                  <Badge variant={timeframe === '30days' ? 'default' : 'outline'}>
                    30 dagar
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=3months">
                  <Badge variant={timeframe === '3months' ? 'default' : 'outline'}>
                    3 månader
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=6months">
                  <Badge variant={timeframe === '6months' ? 'default' : 'outline'}>
                    6 månader
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=1year">
                  <Badge variant={timeframe === '1year' ? 'default' : 'outline'}>
                    1 år
                  </Badge>
                </Link>
              </div>
            </div>

            {/* Type filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Typ av träning</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/athlete/history?timeframe=${timeframe}`}>
                  <Badge variant={!params.type ? 'default' : 'outline'}>
                    Alla
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=RUNNING`}>
                  <Badge variant={params.type === 'RUNNING' ? 'default' : 'outline'}>
                    Löpning
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=CYCLING`}>
                  <Badge variant={params.type === 'CYCLING' ? 'default' : 'outline'}>
                    Cykling
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=STRENGTH`}>
                  <Badge variant={params.type === 'STRENGTH' ? 'default' : 'outline'}>
                    Styrka
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Personal Records */}
      <PersonalRecords athleteId={user.id} variant="glass" />

      {/* Progress Charts */}
      <WorkoutHistoryCharts logs={logs as any} timeframe={timeframe} variant="glass" />

      {/* Workout History Table */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic">Alla träningspass</GlassCardTitle>
          <GlassCardDescription className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">
            DETALJERAD ÖVERSIKT ÖVER ALLA DINA GENOMFÖRDA PASS
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {logs.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <Calendar className="h-16 w-16 mx-auto mb-6 opacity-10 text-white" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Inga pass hittades för vald period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Datum</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Träningspass</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kategori</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Distans</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tid</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 text-center">RPE</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="py-5 font-black text-xs text-slate-400">
                        {log.completedAt ? format(new Date(log.completedAt), 'd MMM yyyy', { locale: sv }) : '-'}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="space-y-0.5">
                          <div className="font-black text-white uppercase italic tracking-tight group-hover:text-blue-400 transition-colors">
                            {log.workout.name}
                          </div>
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            {log.workout.day.week.program.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge className="bg-white/5 border-0 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg h-6">
                          {formatWorkoutType(log.workout.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 font-black text-white text-xs">
                        {log.distance ? `${log.distance.toFixed(1)} km` : '-'}
                      </TableCell>
                      <TableCell className="py-5 font-black text-white text-xs">
                        {log.duration ? `${log.duration} min` : '-'}
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        {log.perceivedEffort ? (
                          <div className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs",
                            getRPEBadgeClass(log.perceivedEffort)
                          )}>
                            {log.perceivedEffort}
                          </div>
                        ) : (
                          <span className="text-slate-700 font-black">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-5 text-right">
                        <Link href={`/athlete/workouts/${log.workout.id}`}>
                          <Button variant="ghost" className="h-8 rounded-lg font-black uppercase tracking-widest text-[9px] bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                            Visa
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
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function getRPEBadgeClass(rpe: number): string {
  if (rpe <= 3) return 'bg-emerald-500/10 text-emerald-400'
  if (rpe <= 5) return 'bg-yellow-500/10 text-yellow-400'
  if (rpe <= 7) return 'bg-orange-500/10 text-orange-400'
  return 'bg-red-500/10 text-red-500'
}
