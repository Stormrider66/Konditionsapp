// app/(business)/[businessSlug]/athlete/training-library/page.tsx

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { TrainingLibraryClient } from '@/components/athlete/TrainingLibraryClient'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Träningsbibliotek | Athlete',
  description: 'All din träning samlad på ett ställe',
}

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

async function getLibraryData(userId: string, clientId: string) {
  const [
    athleteAccount,
    subscription,
    strengthUpcoming,
    strengthCompleted,
    agilityAssignments,
    agilityResults,
    agilityTimingResults,
    wodHistory,
  ] = await Promise.all([
    prisma.athleteAccount.findUnique({
      where: { userId },
      select: { clientId: true },
    }),
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
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId,
        status: { notIn: ['ABANDONED'] },
      },
      select: {
        id: true,
        title: true,
        mode: true,
        workoutType: true,
        requestedDuration: true,
        actualDuration: true,
        status: true,
        createdAt: true,
        completedAt: true,
        sessionRPE: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return {
    athleteAccount,
    subscription,
    strengthUpcoming,
    strengthCompleted,
    agilityAssignments,
    agilityResults,
    agilityTimingResults,
    wodHistory,
  }
}

export default async function BusinessTrainingLibraryPage({ params }: PageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`
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
          basePath={basePath}
          strengthUpcoming={data.strengthUpcoming.map(mapAssignment)}
          strengthCompleted={data.strengthCompleted.map(mapAssignment)}
          agilityAssignments={data.agilityAssignments as any}
          agilityResults={data.agilityResults as any}
          agilityTimingResults={data.agilityTimingResults as any}
          wodHistory={data.wodHistory as any}
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
