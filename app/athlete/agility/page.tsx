// app/athlete/agility/page.tsx
// Main agility page for athletes

import { Suspense } from 'react'
import { Metadata } from 'next'
import { AgilityDashboard } from '@/components/athlete/AgilityDashboard'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Agility Training | Athlete Dashboard',
  description: 'View your assigned agility workouts and track your progress.'
}

async function getAgilityData(clientId: string) {
  const [assignments, results, timingResults] = await Promise.all([
    // Get athlete's workout assignments
    prisma.agilityWorkoutAssignment.findMany({
      where: { athleteId: clientId },
      orderBy: { assignedDate: 'desc' },
      take: 20,
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
            totalDuration: true,
            drills: {
              select: { id: true }
            }
          }
        }
      }
    }),
    // Get athlete's workout results
    prisma.agilityWorkoutResult.findMany({
      where: { athleteId: clientId },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        workout: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    // Get athlete's timing results
    prisma.timingGateResult.findMany({
      where: { athleteId: clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        session: {
          select: {
            sessionName: true,
            sessionDate: true
          }
        }
      }
    })
  ])

  return { assignments, results, timingResults }
}

export default async function AthleteAgilityPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  const data = await getAgilityData(clientId)

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<AgilityDashboardSkeleton />}>
        <AgilityDashboard
          clientId={clientId}
          assignments={data.assignments as any}
          results={data.results as any}
          timingResults={data.timingResults as any}
        />
      </Suspense>
    </div>
  )
}

function AgilityDashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
