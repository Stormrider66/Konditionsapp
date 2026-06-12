// app/(business)/[businessSlug]/athlete/programs/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AthleteProgramOverview } from '@/components/athlete/AthleteProgramOverview'
import { AthleteProgramCalendar } from '@/components/athlete/AthleteProgramCalendar'
import { ProgramFuelingOverview } from '@/components/programs/ProgramFuelingOverview'
import { getBundledAssignments } from '@/lib/programs/bundled-assignments'

interface BusinessProgramPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessAthleteProgramPage({ params }: BusinessProgramPageProps) {
  const { businessSlug, id } = await params
  const locale = await getLocale()
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Fetch program
  const program = await prisma.trainingProgram.findFirst({
    where: {
      id: id,
      clientId: clientId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      test: {
        select: {
          id: true,
          testDate: true,
          testType: true,
          vo2max: true,
          trainingZones: true,
        },
      },
      weeks: {
        orderBy: {
          weekNumber: 'asc',
        },
        include: {
          days: {
            orderBy: {
              dayNumber: 'asc',
            },
            include: {
              workouts: {
                include: {
                  segments: {
                    orderBy: {
                      order: 'asc',
                    },
                    include: {
                      exercise: true,
                    },
                  },
                  logs: {
                    where: {
                      athleteId: user.id,
                    },
                    orderBy: {
                      completedAt: 'desc',
                    },
                    take: 1,
                    include: {
                      fuelingLog: true,
                    },
                  },
                  fuelingPrescription: {
                    include: {
                      plan: {
                        select: {
                          name: true,
                          sport: true,
                          distanceKm: true,
                          targetSpeedKmh: true,
                          targetPowerWatts: true,
                          targetPaceMinKm: true,
                          raceDate: true,
                          recommendedCarbsGPerHour: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    notFound()
  }

  // Studio assignments bundled into this program (linked via programId)
  const bundledAssignments = clientId ? await getBundledAssignments(program.id, clientId) : []

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-5xl mx-auto">
      <Link href={`${basePath}/athlete/programs`}>
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {locale === 'sv' ? 'Mina Program' : 'My Programs'}
        </Button>
      </Link>

      <AthleteProgramOverview program={program as any} basePath={basePath} />

      <div className="mt-8">
        <ProgramFuelingOverview program={program} locale={locale} />
      </div>

      <div className="mt-12">
        <AthleteProgramCalendar program={program as any} athleteId={user.id} basePath={basePath} bundledAssignments={bundledAssignments} />
      </div>
    </div>
  )
}
