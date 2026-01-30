// app/(business)/[businessSlug]/athlete/strength/page.tsx
/**
 * Business Athlete Strength Training Page
 *
 * Self-service strength training for PRO/ENTERPRISE athletes.
 * Allows athletes to browse system templates and self-assign workouts.
 */

import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
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

async function getAthleteData(userId: string) {
  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: {
      clientId: true,
      client: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    return null
  }

  // Get subscription to check tier
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // Get assigned strength sessions with scheduling info
  const assignments = await prisma.strengthSessionAssignment.findMany({
    where: {
      athleteId: athleteAccount.clientId,
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
  })

  return {
    athleteAccount,
    subscription,
    assignments,
  }
}

export default async function BusinessStrengthPage({ params }: BusinessStrengthPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  if (user.role !== 'ATHLETE') {
    redirect(`${basePath}/athlete/dashboard`)
  }

  const data = await getAthleteData(user.id)

  if (!data?.athleteAccount) {
    redirect(`${basePath}/athlete/dashboard`)
  }

  const subscriptionTier = data.subscription?.tier || 'FREE'
  const selfServiceEnabled = ['PRO', 'ENTERPRISE'].includes(subscriptionTier)

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
          upcomingAssignments={data.assignments.map((a) => ({
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
