/**
 * GET /api/athlete/hockey-profile
 *
 * The logged-in athlete's own hockey test profile: position-adjusted composite
 * score, per-test value vs their position target/elite, latest→previous delta,
 * their own percentile/rank vs the team, estimated-1RM flag, and a multi-season
 * trail. Runs the same engine as the coach view (via loadTeamHockeySeasons) but
 * returns ONLY the athlete's slice — no teammate names or raw values.
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getUserLocale, normalizeHockeyPosition } from '@/lib/hockey/team-analysis-engine'
import { loadTeamHockeySeasons } from '@/lib/hockey/team-season-loader'
import { logError } from '@/lib/logger-console'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }
    const { clientId, user } = resolved
    const locale = getUserLocale(user.language)

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        team: {
          select: {
            id: true,
            name: true,
            userId: true,
            members: { select: { id: true, name: true, weight: true, position: true } },
          },
        },
      },
    })

    if (!client?.team) {
      return NextResponse.json({ success: true, data: { hasTeam: false, position: null, seasons: [] } })
    }

    const team = client.team
    const seasons = await loadTeamHockeySeasons({
      teamId: team.id,
      teamName: team.name,
      coachUserId: team.userId,
      members: team.members,
      locale,
    })

    const ownPosition = normalizeHockeyPosition(team.members.find((m) => m.id === clientId)?.position ?? null)

    // Slice every season to the athlete's own rows. Keep their rank/percentile
    // (their standing vs the team) but drop teammate names and values.
    const playerSeasons = seasons
      .map((season) => {
        const composite = season.scores.find((p) => p.clientId === clientId)?.total ?? null
        const groups = season.metricGroups
          .map((group) => {
            const metrics = group.metrics
              .map((m) => {
                const a = m.athletes.find((x) => x.clientId === clientId)
                if (!a || a.latest == null) return null
                return {
                  key: m.key,
                  label: m.label,
                  unit: m.unit,
                  lowerIsBetter: m.lowerIsBetter,
                  target: m.target,
                  elite: m.elite,
                  teamCount: m.coverage,
                  latest: a.latest,
                  previous: a.previous,
                  delta: a.delta,
                  targetGap: a.targetGap,
                  percentile: a.percentile,
                  rank: a.rank,
                  score: a.score,
                  estimated: a.estimated,
                }
              })
              .filter((m): m is NonNullable<typeof m> => m != null)
            return { id: group.id, label: group.label, metrics }
          })
          .filter((g) => g.metrics.length > 0)
        return { key: season.key, label: season.label, composite, groups }
      })
      .filter((s) => s.groups.length > 0)

    return NextResponse.json({
      success: true,
      data: { hasTeam: true, position: ownPosition, seasons: playerSeasons },
    })
  } catch (error) {
    logError('Athlete hockey-profile error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load hockey profile' }, { status: 500 })
  }
}
