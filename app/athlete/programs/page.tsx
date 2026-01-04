// app/athlete/programs/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowRight, CheckCircle2, Play, LayoutGrid } from 'lucide-react'
import { format, differenceInWeeks, isWithinInterval } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export default async function AthleteProgramsPage() {
  const user = await requireAthlete()

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  const now = new Date()

  // Fetch all programs for this athlete
  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId: athleteAccount.clientId,
    },
    include: {
      weeks: {
        select: {
          id: true,
          weekNumber: true,
          phase: true,
        },
        orderBy: { weekNumber: 'asc' },
      },
      _count: {
        select: {
          weeks: true,
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  })

  // Categorize programs
  const activePrograms = programs.filter(
    (p) => p.isActive && isWithinInterval(now, { start: p.startDate, end: p.endDate })
  )
  const upcomingPrograms = programs.filter(
    (p) => p.startDate > now
  )
  const pastPrograms = programs.filter(
    (p) => p.endDate < now || (!p.isActive && !upcomingPrograms.includes(p))
  )

  const getProgramStatus = (program: typeof programs[0]) => {
    if (program.startDate > now) {
      return { label: 'Kommande', variant: 'secondary' as const }
    }
    if (program.endDate < now) {
      return { label: 'Avslutat', variant: 'outline' as const }
    }
    if (program.isActive) {
      return { label: 'Aktivt', variant: 'default' as const }
    }
    return { label: 'Inaktivt', variant: 'outline' as const }
  }

  const getCurrentWeek = (program: typeof programs[0]) => {
    if (program.startDate > now || program.endDate < now) return null
    const weeksElapsed = differenceInWeeks(now, program.startDate) + 1
    return Math.min(weeksElapsed, program._count.weeks)
  }

  const ProgramCard = ({ program }: { program: typeof programs[0] }) => {
    const status = getProgramStatus(program)
    const currentWeek = getCurrentWeek(program)
    const isActive = status.label === 'Aktivt'

    return (
      <Link href={`/athlete/programs/${program.id}`} className="block group">
        <GlassCard className={cn(
          "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          isActive && "bg-blue-600/5 border-blue-600/20 shadow-lg shadow-blue-600/5"
        )}>
          <GlassCardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <GlassCardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {program.name}
                </GlassCardTitle>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-500" />
                  <span>
                    {format(program.startDate, 'd MMM yyyy', { locale: sv })} — {format(program.endDate, 'd MMM yyyy', { locale: sv })}
                  </span>
                </div>
              </div>
              <Badge className={cn(
                "rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest border-0 transition-colors",
                status.label === 'Aktivt' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                  status.label === 'Kommande' ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                    "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-500"
              )}>
                {status.label}
              </Badge>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex items-center gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Längd</p>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black transition-colors">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                  <span>{program._count.weeks} veckor</span>
                </div>
              </div>
              {currentWeek && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nuvarande</p>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black transition-colors">
                    <Play className="h-4 w-4 fill-current" />
                    <span>Vecka {currentWeek}</span>
                  </div>
                </div>
              )}
            </div>

            {program.weeks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {program.weeks.slice(0, 8).map((week) => (
                  <Badge
                    key={week.id}
                    variant="outline"
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg transition-colors",
                      "bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/5 dark:text-slate-500",
                      week.weekNumber === currentWeek && "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-600/20 dark:border-blue-600/30 dark:text-blue-400"
                    )}
                  >
                    {week.phase || `W${week.weekNumber}`}
                  </Badge>
                ))}
                {program.weeks.length > 8 && (
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[9px] font-black text-slate-600 dark:text-slate-500 transition-colors">
                    +{program.weeks.length - 8}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-500 flex items-center gap-2 group-hover:gap-3 transition-all">
                Gå till program <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </Link>
    )
  }

  return (
    <div className="min-h-screen pb-20 pt-10 px-4 max-w-4xl mx-auto">
      <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mb-4 transition-colors">
          Mina <span className="text-blue-600 dark:text-blue-500 italic">Program</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm max-w-md transition-colors">
          Alla dina träningsprogram samlade på ett ställe. Följ din utveckling och se kommande utmaningar.
        </p>
      </div>

      {programs.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/5 flex items-center justify-center mx-auto mb-6 transition-colors">
              <Calendar className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">Inga program ännu</h3>
            <p className="text-slate-600 dark:text-slate-500 max-w-xs mx-auto font-medium transition-colors">
              Din coach har inte skapat några träningsprogram åt dig ännu. De dyker upp här så snart de är klara.
            </p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="space-y-12">
          {/* Active Programs */}
          {activePrograms.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-500 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 transition-colors">
                  <Play className="h-3 w-3 fill-current" />
                  Aktiva Program
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
              </div>
              <div className="grid gap-6">
                {activePrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Programs */}
          {upcomingPrograms.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/5 transition-colors">
                  <Clock className="h-3 w-3" />
                  Kommande Program
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
              </div>
              <div className="grid gap-6">
                {upcomingPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </section>
          )}

          {/* Past Programs */}
          {pastPrograms.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-500 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/5 transition-colors">
                  <CheckCircle2 className="h-3 w-3" />
                  Avslutade Program
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 transition-colors" />
              </div>
              <div className="grid gap-4">
                {pastPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
