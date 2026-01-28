// app/(business)/[businessSlug]/athlete/matches/page.tsx
/**
 * Matches Page (Business Athlete Portal)
 *
 * Business-specific implementation with basePath.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { MatchesPageClient } from '@/app/athlete/matches/MatchesPageClient'

interface BusinessMatchesPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessMatchesPage({ params }: BusinessMatchesPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get client with sport profile
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { sportProfile: true },
  })

  // Fetch all matches for this athlete
  const matches = await prisma.externalMatchSchedule.findMany({
    where: { clientId: clientId },
    orderBy: { scheduledDate: 'desc' },
  })

  // Calculate season stats
  const completedMatches = matches.filter(m => m.result)
  const upcomingMatches = matches.filter(m => !m.result && new Date(m.scheduledDate) > new Date())

  const stats = {
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    upcomingMatches: upcomingMatches.length,
    totalGoals: completedMatches.reduce((sum, m) => sum + (m.goals || 0), 0),
    totalAssists: completedMatches.reduce((sum, m) => sum + (m.assists || 0), 0),
    totalMinutesPlayed: completedMatches.reduce((sum, m) => sum + (m.minutesPlayed || 0), 0),
    avgDistanceKm: completedMatches.filter(m => m.distanceKm).length > 0
      ? completedMatches.reduce((sum, m) => sum + (m.distanceKm || 0), 0) / completedMatches.filter(m => m.distanceKm).length
      : null,
  }

  return (
    <MatchesPageClient
      matches={matches}
      stats={stats}
      clientId={clientId}
      sportType={client?.sportProfile?.primarySport}
      basePath={basePath}
    />
  )
}
