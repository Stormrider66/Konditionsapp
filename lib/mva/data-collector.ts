import { prisma } from '@/lib/prisma'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import type { AthleteDataBundle, MVAVariableInfo } from './types'
import { MVA_VARIABLE_REGISTRY } from './variable-registry'

/**
 * Collect data for all team members in parallel.
 * Returns bundles with full AthleteProfileData + integration data for each athlete.
 */
export async function collectTeamData(teamId: string): Promise<AthleteDataBundle[]> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          sportProfile: {
            select: { primarySport: true },
          },
        },
      },
    },
  })

  if (!team || team.members.length === 0) {
    return []
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const bundles = await Promise.all(
    team.members.map(async (member) => {
      const [
        data,
        stravaActivities,
        garminActivities,
        concept2Results,
        weeklySummaries,
        sportTests,
        ergometerTests,
        timingGateResults,
        movementScreens,
      ] = await Promise.all([
          fetchAthleteProfileData(member.id),
          prisma.stravaActivity.findMany({
            where: { clientId: member.id, startDate: { gte: thirtyDaysAgo } },
            select: {
              id: true,
              startDate: true,
              distance: true,
              movingTime: true,
              averageHeartrate: true,
              type: true,
            },
            orderBy: { startDate: 'desc' },
          }),
          prisma.garminActivity.findMany({
            where: { clientId: member.id, startDate: { gte: thirtyDaysAgo } },
            select: {
              id: true,
              startDate: true,
              distance: true,
              duration: true,
              averageHeartrate: true,
              trainingEffect: true,
              type: true,
            },
            orderBy: { startDate: 'desc' },
          }),
          prisma.concept2Result.findMany({
            where: { clientId: member.id, date: { gte: thirtyDaysAgo } },
            select: {
              id: true,
              date: true,
              distance: true,
              time: true,
              strokeRate: true,
              type: true,
            },
            orderBy: { date: 'desc' },
          }),
          prisma.weeklyTrainingSummary.findMany({
            where: { clientId: member.id, weekStart: { gte: thirtyDaysAgo } },
            select: {
              id: true,
              weekStart: true,
              totalTSS: true,
              totalDistance: true,
              totalDuration: true,
              workoutCount: true,
              completedWorkoutCount: true,
              plannedWorkoutCount: true,
              compliancePercent: true,
              avgReadiness: true,
              avgSleepQuality: true,
              avgFatigue: true,
            },
            orderBy: { weekStart: 'desc' },
          }),
          // Sport tests (best attempts, last 90 days)
          prisma.sportTest.findMany({
            where: { clientId: member.id, testDate: { gte: ninetyDaysAgo }, valid: true },
            select: {
              id: true,
              testDate: true,
              category: true,
              protocol: true,
              primaryResult: true,
              primaryUnit: true,
              secondaryResult: true,
              peakPower: true,
              avgPower: true,
              relativePower: true,
              acceleration: true,
              maxVelocity: true,
              estimatedVO2max: true,
              distance: true,
              level: true,
              bestAttempt: true,
            },
            orderBy: { testDate: 'desc' },
          }),
          // Ergometer field tests (last 90 days)
          prisma.ergometerFieldTest.findMany({
            where: { clientId: member.id, testDate: { gte: ninetyDaysAgo }, valid: true },
            select: {
              id: true,
              testDate: true,
              ergometerType: true,
              testProtocol: true,
              peakPower: true,
              avgPower: true,
              criticalPower: true,
              wPrime: true,
              totalDistance: true,
              avgPace: true,
              avgHR: true,
              maxHR: true,
            },
            orderBy: { testDate: 'desc' },
          }),
          // Timing gate results (last 90 days)
          prisma.timingGateResult.findMany({
            where: { athleteId: member.id, valid: true, session: { sessionDate: { gte: ninetyDaysAgo } } },
            select: {
              id: true,
              session: { select: { sessionDate: true } },
              testProtocol: true,
              splitTimes: true,
              totalTime: true,
              acceleration: true,
              maxVelocity: true,
              codDeficit: true,
              valid: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          // Movement screens (latest 5)
          prisma.movementScreen.findMany({
            where: { clientId: member.id },
            select: {
              id: true,
              screenDate: true,
              screenType: true,
              totalScore: true,
              asymmetryFlag: true,
              improvement: true,
            },
            orderBy: { screenDate: 'desc' },
            take: 5,
          }),
        ])

      return {
        clientId: member.id,
        clientName: member.name,
        position: member.sportProfile?.primarySport ?? null,
        data,
        strava: stravaActivities,
        garmin: garminActivities,
        concept2: concept2Results,
        weeklySummaries,
        sportTests,
        ergometerTests,
        timingGateResults: timingGateResults.map((r) => ({
          ...r,
          sessionDate: r.session.sessionDate,
        })),
        movementScreens,
      } satisfies AthleteDataBundle
    })
  )

  return bundles
}

/**
 * Compute variable coverage statistics for a team.
 * Returns info about each variable including how many athletes have data.
 */
export function computeVariableCoverage(bundles: AthleteDataBundle[]): MVAVariableInfo[] {
  const totalAthletes = bundles.length

  return MVA_VARIABLE_REGISTRY.map((variable) => {
    let athleteCount = 0

    for (const bundle of bundles) {
      const value = variable.extractor(bundle)
      if (value != null && isFinite(value)) {
        athleteCount++
      }
    }

    return {
      id: variable.id,
      name: variable.name,
      nameSv: variable.nameSv,
      category: variable.category,
      unit: variable.unit,
      coverage: totalAthletes > 0 ? athleteCount / totalAthletes : 0,
      athleteCount,
      totalAthletes,
      sportRelevance: variable.sportRelevance,
    }
  })
}
