// app/(business)/[businessSlug]/coach/programs/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { canAccessProgram } from '@/lib/auth-utils'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProgramOverview } from '@/components/programs/ProgramOverview'
import { ProgramCalendar } from '@/components/programs/ProgramCalendar'
import { ProgramFuelingOverview } from '@/components/programs/ProgramFuelingOverview'

interface ProgramPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessProgramPage({ params }: ProgramPageProps) {
  const { businessSlug, id } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

  // Check access
  const hasAccess = await canAccessProgram(user.id, id)
  if (!hasAccess) {
    redirect(`${basePath}/programs`)
  }

  // Fetch full program
  const program = await prisma.trainingProgram.findFirst({
    where: {
      id,
      coachId: { in: coachIds },
      client: {
        businessId: membership.businessId,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true,
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={`${basePath}/programs`}>
        <Button variant="ghost" className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <ProgramOverview program={program} basePath={basePath} />

      <div className="mt-8">
        <ProgramFuelingOverview program={program} />
      </div>

      <div className="mt-8">
        <ProgramCalendar program={program} basePath={basePath} />
      </div>
    </div>
  )
}
