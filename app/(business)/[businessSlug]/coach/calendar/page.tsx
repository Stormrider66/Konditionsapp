/**
 * Business-Scoped Coach Calendar Overview
 *
 * Shows all athletes' calendars with filtering and quick navigation.
 * Provides aggregated view of upcoming events, workouts, and races.
 */

import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { CoachCalendarClient } from '@/app/coach/calendar/CoachCalendarClient'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { notFound } from 'next/navigation'
import { SportType } from '@prisma/client'

interface BusinessCalendarPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCalendarPage({ params }: BusinessCalendarPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get all coaches in the business
  const members = await prisma.businessMember.findMany({
    where: {
      businessId: membership.businessId,
      isActive: true,
      user: { role: 'COACH' },
    },
    select: { userId: true },
  })
  const coachIds = members.map(m => m.userId)
  if (!coachIds.includes(user.id)) {
    coachIds.push(user.id)
  }

  // Get all athletes for this business (with team and sport info)
  const athletes = await prisma.client.findMany({
    where: {
      userId: { in: coachIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      sportProfile: {
        select: {
          primarySport: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Get all teams for this business
  const teams = await prisma.team.findMany({
    where: {
      userId: { in: coachIds },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  })

  // Get unique sports from athletes
  const uniqueSports = [...new Set(
    athletes
      .map(a => a.sportProfile?.primarySport)
      .filter((sport): sport is SportType => !!sport)
  )]

  // Get upcoming events for next 14 days (all athletes)
  const now = new Date()
  const twoWeeksFromNow = addDays(now, 14)

  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      clientId: { in: athletes.map(a => a.id) },
      startDate: {
        gte: startOfDay(now),
        lte: endOfDay(twoWeeksFromNow),
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      endDate: true,
      trainingImpact: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
    take: 50,
  })

  // Get today's workouts across all athletes
  const todaysWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
        week: {
          program: {
            clientId: { in: athletes.map(a => a.id) },
            isActive: true,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
      intensity: true,
      day: {
        select: {
          date: true,
          week: {
            select: {
              program: {
                select: {
                  client: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      logs: {
        where: { completed: true },
        select: { id: true },
      },
    },
    orderBy: {
      day: {
        week: {
          program: {
            client: {
              name: 'asc',
            },
          },
        },
      },
    },
    take: 50,
  })

  // Format workouts for client
  const formattedWorkouts = todaysWorkouts.map(w => ({
    id: w.id,
    name: w.name,
    type: w.type,
    intensity: w.intensity,
    completed: w.logs.length > 0,
    athlete: w.day.week.program.client,
  }))

  // Get upcoming races (special events)
  const upcomingRaces = upcomingEvents.filter(e =>
    ['RACE_A', 'RACE_B', 'RACE_C', 'COMPETITION'].includes(e.type)
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <CoachCalendarClient
          athletes={athletes}
          upcomingEvents={upcomingEvents}
          todaysWorkouts={formattedWorkouts}
          upcomingRaces={upcomingRaces}
          basePath={basePath}
          teams={teams}
          sports={uniqueSports}
        />
      </div>
    </div>
  )
}
