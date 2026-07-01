/**
 * Athlete Strength Training Page
 *
 * Self-service strength training for PRO/ELITE athletes.
 * Allows athletes to browse system templates and self-assign workouts.
 */

import { Suspense } from 'react'
import { Dumbbell } from 'lucide-react'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getAthleteSelfServiceAccess } from '@/lib/auth/tier-utils'
import { prisma } from '@/lib/prisma'
import { AthleteStrengthClient } from './client'
import { Skeleton } from '@/components/ui/skeleton'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.strength')

  return {
    title: t('title'),
    description: t('description'),
  }
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

export default async function AthleteStrengthPage() {
  const t = await getTranslations('metadata.athlete.strength')
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const data = await getAthleteData(clientId)
  const { tier: subscriptionTier, enabled: selfServiceEnabled } = await getAthleteSelfServiceAccess(clientId)

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
          <Dumbbell className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold italic uppercase tracking-tight leading-none mb-1 text-slate-900 dark:text-white transition-colors">{t('title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">
            {t('description')}
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AthleteStrengthClient
          clientId={clientId}
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
            garminWorkoutId: a.garminWorkoutId,
            garminPushedAt: a.garminPushedAt?.toISOString() ?? null,
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
            garminWorkoutId: a.garminWorkoutId,
            garminPushedAt: a.garminPushedAt?.toISOString() ?? null,
            startTime: a.startTime,
            endTime: a.endTime,
            locationName: a.locationName,
            location: a.location,
          }))}
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
