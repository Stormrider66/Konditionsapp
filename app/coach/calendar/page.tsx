/**
 * Coach Calendar Overview
 *
 * Shows all athletes' calendars with filtering and quick navigation.
 * Provides aggregated view of upcoming events, workouts, and races.
 */

import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getBusinessContext } from '@/lib/auth-utils'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { CoachCalendarClient } from './CoachCalendarClient'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { SportType } from '@prisma/client'

export default async function CoachCalendarPage() {
  const user = await requireCoach()

  // Check if coach is part of a business
  const businessContext = await getBusinessContext(user.id)

  // Get coach IDs scoped by role (OWNER/ADMIN see all, COACH sees own)
  let coachIds = [user.id]
  if (businessContext.businessId) {
    coachIds = await getCoachScopedIds(user.id, businessContext.businessId, businessContext.role ?? 'COACH')
  }

  // Get all athletes for this coach/business (with team and sport info)
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

  // Get all teams for this coach/business
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
          teams={teams}
          sports={uniqueSports}
        />
      </div>
    </div>
  )
}
