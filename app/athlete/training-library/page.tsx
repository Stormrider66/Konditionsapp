// app/athlete/training-library/page.tsx

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { TrainingLibraryClient } from '@/components/athlete/TrainingLibraryClient'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Träningsbibliotek | Athlete',
  description: 'All din träning samlad på ett ställe',
}

async function getLibraryData(userId: string, clientId: string) {
  const [
    subscription,
    strengthUpcoming,
    strengthCompleted,
    agilityAssignments,
    agilityResults,
    agilityTimingResults,
  ] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true },
    }),
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        session: {
          select: { id: true, name: true, phase: true, estimatedDuration: true },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
      take: 10,
    }),
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
      },
      include: {
        session: {
          select: { id: true, name: true, phase: true, estimatedDuration: true },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'desc' },
      take: 20,
    }),
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
            drills: { select: { id: true } },
          },
        },
      },
    }),
    prisma.agilityWorkoutResult.findMany({
      where: { athleteId: clientId },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        workout: { select: { id: true, name: true } },
      },
    }),
    prisma.timingGateResult.findMany({
      where: { athleteId: clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        session: { select: { sessionName: true, sessionDate: true } },
      },
    }),
  ])

  return {
    subscription,
    strengthUpcoming,
    strengthCompleted,
    agilityAssignments,
    agilityResults,
    agilityTimingResults,
  }
}

export default async function TrainingLibraryPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get clientId from athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { clientId: true },
  })

  if (!athleteAccount) {
    redirect('/athlete/dashboard')
  }

  const clientId = athleteAccount.clientId
  const data = await getLibraryData(user.id, clientId)
  const subscriptionTier = data.subscription?.tier || 'FREE'
  const selfServiceEnabled = ['PRO', 'ENTERPRISE'].includes(subscriptionTier)

  const mapAssignment = (a: typeof data.strengthUpcoming[number]) => ({
    id: a.id,
    sessionId: a.session.id,
    sessionName: a.session.name,
    phase: a.session.phase,
    estimatedDuration: a.session.estimatedDuration,
    assignedDate: a.assignedDate.toISOString(),
    status: a.status,
    startTime: a.startTime,
    endTime: a.endTime,
    locationName: a.locationName,
    location: a.location,
  })

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <Suspense fallback={<LibrarySkeleton />}>
        <TrainingLibraryClient
          clientId={clientId}
          selfServiceEnabled={selfServiceEnabled}
          subscriptionTier={subscriptionTier}
          basePath=""
          strengthUpcoming={data.strengthUpcoming.map(mapAssignment)}
          strengthCompleted={data.strengthCompleted.map(mapAssignment)}
          agilityAssignments={data.agilityAssignments as any}
          agilityResults={data.agilityResults as any}
          agilityTimingResults={data.agilityTimingResults as any}
        />
      </Suspense>
    </div>
  )
}

function LibrarySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}
