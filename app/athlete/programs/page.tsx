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
                <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic group-hover:text-blue-400 transition-colors">
                  {program.name}
                </GlassCardTitle>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  <span>
                    {format(program.startDate, 'd MMM yyyy', { locale: sv })} — {format(program.endDate, 'd MMM yyyy', { locale: sv })}
                  </span>
                </div>
              </div>
              <Badge className={cn(
                "rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest border-0",
                status.label === 'Aktivt' ? "bg-emerald-500/20 text-emerald-400" :
                  status.label === 'Kommande' ? "bg-blue-500/20 text-blue-400" :
                    "bg-white/5 text-slate-500"
              )}>
                {status.label}
              </Badge>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex items-center gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Längd</p>
                <div className="flex items-center gap-2 text-white font-black">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{program._count.weeks} veckor</span>
                </div>
              </div>
              {currentWeek && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Nuvarande</p>
                  <div className="flex items-center gap-2 text-blue-400 font-black">
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
                      "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg border-white/5 bg-white/5 text-slate-500",
                      week.weekNumber === currentWeek && "bg-blue-600/20 text-blue-400 border-blue-600/30"
                    )}
                  >
                    {week.phase || `W${week.weekNumber}`}
                  </Badge>
                ))}
                {program.weeks.length > 8 && (
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black text-slate-600">
                    +{program.weeks.length - 8}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2 group-hover:gap-3 transition-all">
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
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">
          Mina <span className="text-blue-600 italic">Program</span>
        </h1>
        <p className="text-slate-400 font-medium text-sm max-w-md">
          Alla dina träningsprogram samlade på ett ställe. Följ din utveckling och se kommande utmaningar.
        </p>
      </div>

      {programs.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Inga program ännu</h3>
            <p className="text-slate-500 max-w-xs mx-auto font-medium">
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
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10">
                  <Play className="h-3 w-3 fill-current" />
                  Aktiva Program
                </h2>
                <div className="h-px flex-1 bg-white/5" />
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
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                  <Clock className="h-3 w-3" />
                  Kommande Program
                </h2>
                <div className="h-px flex-1 bg-white/5" />
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
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                  <CheckCircle2 className="h-3 w-3" />
                  Avslutade Program
                </h2>
                <div className="h-px flex-1 bg-white/5" />
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
