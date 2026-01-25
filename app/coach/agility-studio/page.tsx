// app/coach/agility-studio/page.tsx
// Main Agility Studio page for coaches

import { Suspense } from 'react'
import { Metadata } from 'next'
import AgilityStudioClient from '@/components/agility-studio/AgilityStudioClient'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Agility Studio | Coach Dashboard',
  description: 'Create and manage agility training workouts, drills, and timing gate sessions.'
}

async function getInitialData(userId: string) {
  const [drills, workouts, athletes, timingSessions] = await Promise.all([
    // Get system drills and coach's custom drills
    prisma.agilityDrill.findMany({
      where: {
        OR: [
          { isSystemDrill: true },
          { coachId: userId }
        ]
      },
      orderBy: [
        { category: 'asc' },
        { difficultyLevel: 'asc' },
        { name: 'asc' }
      ],
      take: 100
    }),
    // Get coach's workouts
    prisma.agilityWorkout.findMany({
      where: { coachId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: {
              select: { id: true, name: true, nameSv: true, category: true }
            }
          }
        },
        _count: {
          select: { assignments: true, results: true }
        }
      }
    }),
    // Get coach's athletes for assignment
    prisma.client.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, teamId: true }
    }),
    // Get recent timing sessions
    prisma.timingGateSession.findMany({
      where: { coachId: userId },
      orderBy: { sessionDate: 'desc' },
      take: 10,
      include: {
        _count: { select: { results: true } }
      }
    })
  ])

  return { drills, workouts, athletes, timingSessions }
}

export default async function AgilityStudioPage() {
  const user = await requireCoach()

  const initialData = await getInitialData(user.id)

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<AgilityStudioSkeleton />}>
        <AgilityStudioClient
          userId={user.id}
          initialDrills={initialData.drills as any}
          initialWorkouts={initialData.workouts as any}
          initialAthletes={initialData.athletes}
          initialTimingSessions={initialData.timingSessions as any}
        />
      </Suspense>
    </div>
  )
}

function AgilityStudioSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-10 w-full bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  )
}
