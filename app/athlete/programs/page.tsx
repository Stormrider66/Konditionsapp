// app/athlete/programs/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowRight, CheckCircle2, Play } from 'lucide-react'
import { format, differenceInWeeks, isWithinInterval } from 'date-fns'
import { sv } from 'date-fns/locale'

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
      <Link href={`/athlete/programs/${program.id}`} className="block">
        <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'border-blue-200 bg-blue-50/30' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{program.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {format(program.startDate, 'd MMM yyyy', { locale: sv })} - {format(program.endDate, 'd MMM yyyy', { locale: sv })}
                </CardDescription>
              </div>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{program._count.weeks} veckor</span>
              </div>
              {currentWeek && (
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">Vecka {currentWeek}</span>
                </div>
              )}
            </div>
            {program.weeks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {program.weeks.slice(0, 6).map((week) => (
                  <Badge
                    key={week.id}
                    variant="outline"
                    className={`text-[10px] ${week.weekNumber === currentWeek ? 'bg-blue-100 border-blue-300' : ''}`}
                  >
                    {week.phase || `V${week.weekNumber}`}
                  </Badge>
                ))}
                {program.weeks.length > 6 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{program.weeks.length - 6}
                  </Badge>
                )}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <span className="text-xs text-blue-600 flex items-center gap-1">
                Visa program <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mina Program</h1>
        <p className="text-muted-foreground text-sm">
          Alla dina träningsprogram samlade på ett ställe
        </p>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-2">Inga program ännu</h3>
            <p className="text-sm text-muted-foreground">
              Din coach har inte skapat några träningsprogram för dig ännu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Programs */}
          {activePrograms.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-500" />
                Aktiva Program
              </h2>
              <div className="grid gap-4">
                {activePrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Programs */}
          {upcomingPrograms.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Kommande Program
              </h2>
              <div className="grid gap-4">
                {upcomingPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </section>
          )}

          {/* Past Programs */}
          {pastPrograms.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Avslutade Program
              </h2>
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
