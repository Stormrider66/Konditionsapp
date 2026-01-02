// app/athlete/programs/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AthleteProgramOverview } from '@/components/athlete/AthleteProgramOverview'
import { AthleteProgramCalendar } from '@/components/athlete/AthleteProgramCalendar'

interface AthleteProgramPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AthleteProgramPage({ params }: AthleteProgramPageProps) {
  const user = await requireAthlete()
  const { id } = await params

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch program
  const program = await prisma.trainingProgram.findFirst({
    where: {
      id: id,
      clientId: athleteAccount.clientId,
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
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-5xl mx-auto">
      <Link href="/athlete/programs">
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Mina Program
        </Button>
      </Link>

      <AthleteProgramOverview program={program as any} />

      <div className="mt-12">
        <AthleteProgramCalendar program={program as any} athleteId={user.id} />
      </div>
    </div>
  )
}
