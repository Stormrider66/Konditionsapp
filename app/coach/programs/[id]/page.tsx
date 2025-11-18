// app/coach/programs/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessProgram } from '@/lib/auth-utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProgramOverview } from '@/components/programs/ProgramOverview'
import { ProgramCalendar } from '@/components/programs/ProgramCalendar'

interface ProgramPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const user = await requireCoach()
  const { id } = await params

  // Check access
  const hasAccess = await canAccessProgram(user.id, id)
  if (!hasAccess) {
    redirect('/coach/programs')
  }

  // Fetch full program
  const program = await prisma.trainingProgram.findUnique({
    where: { id: id },
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
      <Link href="/coach/programs">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <ProgramOverview program={program} />

      <div className="mt-8">
        <ProgramCalendar program={program} />
      </div>
    </div>
  )
}
