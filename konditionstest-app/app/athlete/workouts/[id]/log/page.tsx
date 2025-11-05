// app/athlete/workouts/[id]/log/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { WorkoutLoggingForm } from '@/components/athlete/WorkoutLoggingForm'

interface WorkoutLogPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutLogPage({ params }: WorkoutLogPageProps) {
  const user = await requireAthlete()
  const { id } = await params

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch workout with program info
  const workout = await prisma.workout.findFirst({
    where: {
      id: id,
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                  clientId: true,
                },
              },
            },
          },
        },
      },
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
  })

  if (!workout || !workout.day.week.program) {
    notFound()
  }

  // Verify athlete has access to this program
  if (workout.day.week.program.clientId !== athleteAccount.clientId) {
    notFound()
  }

  const existingLog = workout.logs[0]

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Link href={`/athlete/programs/${workout.day.week.program.id}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {existingLog ? 'Redigera träningslogg' : 'Logga träningspass'}
        </h1>
        <p className="text-muted-foreground">{workout.name}</p>
      </div>

      {/* Coach Feedback - Show if exists */}
      {existingLog?.coachFeedback && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full p-2 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-blue-900">Feedback från coach</h3>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Ny
                  </span>
                </div>
                <p className="text-blue-900 leading-relaxed whitespace-pre-wrap">
                  {existingLog.coachFeedback}
                </p>
                {existingLog.coachViewedAt && (
                  <p className="text-xs text-blue-600 mt-3">
                    {new Date(existingLog.coachViewedAt).toLocaleDateString('sv-SE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <WorkoutLoggingForm
        workout={workout as any}
        athleteId={user.id}
        existingLog={existingLog as any}
      />
    </div>
  )
}
