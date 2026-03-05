// app/(business)/[businessSlug]/athlete/strength/page.tsx
/**
 * Business Athlete Strength Training Page
 *
 * Self-service strength training for PRO/ELITE athletes.
 * Allows athletes to browse system templates and self-assign workouts.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getAthleteSelfServiceAccess } from '@/lib/auth/tier-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { AthleteStrengthClient } from '@/app/athlete/strength/client'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Styrketräning | Athlete',
  description: 'Bläddra och schemalägg styrkepass',
}

interface BusinessStrengthPageProps {
  params: Promise<{ businessSlug: string }>
}

async function getAthleteData(clientId: string) {
  // Get assigned strength sessions with scheduling info
  const [upcomingAssignments, completedAssignments] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        assignedDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            phase: true,
            estimatedDuration: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        assignedDate: 'asc',
      },
      take: 10,
    }),
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            phase: true,
            estimatedDuration: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        assignedDate: 'desc',
      },
      take: 20,
    }),
  ])

  return {
    upcomingAssignments,
    completedAssignments,
  }
}

export default async function BusinessStrengthPage({ params }: BusinessStrengthPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`
  const data = await getAthleteData(clientId)
  const { tier: subscriptionTier, enabled: selfServiceEnabled } = await getAthleteSelfServiceAccess(clientId)

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Styrketräning
        </h1>
        <p className="text-muted-foreground mt-2">
          Bläddra mallar och schemalägg dina styrkepass
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AthleteStrengthClient
          selfServiceEnabled={selfServiceEnabled}
          subscriptionTier={subscriptionTier}
          upcomingAssignments={data.upcomingAssignments.map((a) => ({
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
          }))}
          completedAssignments={data.completedAssignments.map((a) => ({
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
          }))}
          basePath={basePath}
        />
      </Suspense>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
