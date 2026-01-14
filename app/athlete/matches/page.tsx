import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { MatchesPageClient } from './MatchesPageClient'

export default async function MatchesPage() {
  const user = await requireAthlete()

  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        include: {
          sportProfile: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch all matches for this athlete
  const matches = await prisma.externalMatchSchedule.findMany({
    where: { clientId: athleteAccount.clientId },
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
      clientId={athleteAccount.clientId}
      sportType={athleteAccount.client.sportProfile?.primarySport}
    />
  )
}
