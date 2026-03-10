import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, startOfWeek, endOfWeek } from 'date-fns'

export async function GET() {
  try {
    const user = await requireCoach()
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const sevenDaysAgo = subDays(now, 7)
    const sixtyDaysAgo = subDays(now, 60)
    const thirtyDaysAgo = subDays(now, 30)

    // Get all business memberships for this coach
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { businessId: true },
    })

    const businessIds = memberships.map(m => m.businessId)

    const members = await prisma.businessMember.findMany({
      where: {
        businessId: { in: businessIds },
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { userId: true },
    })
    const coachIds = [...new Set([user.id, ...members.map(m => m.userId)])]

    // 8 parallel queries
    const [
      clients,
      progressionData,
      recentPRs,
      previousPRs,
      sessionAssignments,
      bodyCompData,
      activeInjuries,
      lastActivities,
    ] = await Promise.all([
      // 1. Clients with sport profile
      prisma.client.findMany({
        where: { userId: { in: coachIds } },
        select: {
          id: true,
          name: true,
          sportProfile: { select: { primarySport: true } },
        },
      }),

      // 2. ProgressionTracking — latest per client+exercise (last 30 days)
      prisma.progressionTracking.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: thirtyDaysAgo },
        },
        select: {
          clientId: true,
          exerciseId: true,
          strengthPhase: true,
          progressionStatus: true,
          plateauWeeks: true,
          readyForIncrease: true,
          estimated1RM: true,
          exercise: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      }),

      // 3. OneRepMaxHistory — last 7 days (PRs feed + per-client PR flag)
      prisma.oneRepMaxHistory.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          clientId: true,
          exerciseId: true,
          oneRepMax: true,
          date: true,
          source: true,
          exercise: { select: { name: true } },
          client: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      }),

      // 4. OneRepMaxHistory — previous records (8-60 days ago) for delta calculations
      prisma.oneRepMaxHistory.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: sixtyDaysAgo, lt: subDays(now, 7) },
        },
        select: {
          clientId: true,
          exerciseId: true,
          oneRepMax: true,
        },
        orderBy: { date: 'desc' },
      }),

      // 5. StrengthSessionAssignment — this week by client
      prisma.strengthSessionAssignment.findMany({
        where: {
          athlete: { userId: { in: coachIds } },
          assignedDate: { gte: weekStart, lte: weekEnd },
        },
        select: {
          athleteId: true,
          status: true,
        },
      }),

      // 6. BodyComposition — last 2 per client (for deltas)
      prisma.bodyComposition.findMany({
        where: {
          client: { userId: { in: coachIds } },
        },
        select: {
          clientId: true,
          measurementDate: true,
          weightKg: true,
          bodyFatPercent: true,
          muscleMassKg: true,
          client: { select: { name: true } },
        },
        orderBy: { measurementDate: 'desc' },
      }),

      // 7. Active injuries per client
      prisma.injuryAssessment.groupBy({
        by: ['clientId'],
        where: {
          client: { userId: { in: coachIds } },
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        _count: { id: true },
      }),

      // 8. Last strength session activity per client
      prisma.strengthSessionAssignment.groupBy({
        by: ['athleteId'],
        where: {
          athlete: { userId: { in: coachIds } },
          status: 'COMPLETED',
        },
        _max: { completedAt: true },
      }),
    ])

    // --- Build lookup maps ---

    // Injury map
    const injuryMap = new Map<string, number>()
    for (const i of activeInjuries) {
      injuryMap.set(i.clientId, i._count.id)
    }

    // Last activity map
    const activityMap = new Map<string, Date | null>()
    for (const a of lastActivities) {
      activityMap.set(a.athleteId, a._max.completedAt)
    }

    // Progression map: per client, aggregate across exercises
    // Track: latest phase, worst status, plateau exercise count, ready-for-increase count, top exercise
    interface ClientProgression {
      currentPhase: string | null
      worstProgressionStatus: string | null
      plateauExercises: number
      readyForIncreaseCount: number
      topExerciseName: string | null
      topEstimated1RM: number | null
    }

    const statusSeverity: Record<string, number> = {
      ON_TRACK: 0,
      PLATEAU: 1,
      DELOAD_NEEDED: 2,
      REGRESSING: 3,
    }

    const progressionMap = new Map<string, ClientProgression>()
    // Track seen client+exercise combos (first = most recent due to orderBy desc)
    const seenProgressionKeys = new Set<string>()

    for (const p of progressionData) {
      const key = `${p.clientId}:${p.exerciseId}`
      if (seenProgressionKeys.has(key)) continue
      seenProgressionKeys.add(key)

      const current = progressionMap.get(p.clientId) || {
        currentPhase: null,
        worstProgressionStatus: null,
        plateauExercises: 0,
        readyForIncreaseCount: 0,
        topExerciseName: null,
        topEstimated1RM: null,
      }

      // Phase: use first encountered (most recent)
      if (!current.currentPhase && p.strengthPhase) {
        current.currentPhase = p.strengthPhase
      }

      // Worst status
      const currentSev = current.worstProgressionStatus
        ? (statusSeverity[current.worstProgressionStatus] ?? 0)
        : -1
      const newSev = statusSeverity[p.progressionStatus] ?? 0
      if (newSev > currentSev) {
        current.worstProgressionStatus = p.progressionStatus
      }

      // Plateau exercises
      if (p.plateauWeeks >= 3) {
        current.plateauExercises++
      }

      // Ready for increase
      if (p.readyForIncrease) {
        current.readyForIncreaseCount++
      }

      // Top exercise (highest e1RM)
      if (p.estimated1RM && (current.topEstimated1RM === null || p.estimated1RM > current.topEstimated1RM)) {
        current.topEstimated1RM = p.estimated1RM
        current.topExerciseName = p.exercise.name
      }

      progressionMap.set(p.clientId, current)
    }

    // Previous 1RM map: per client+exercise → highest previous
    const previous1RMMap = new Map<string, number>()
    for (const p of previousPRs) {
      const key = `${p.clientId}:${p.exerciseId}`
      const current = previous1RMMap.get(key) ?? 0
      if (p.oneRepMax > current) {
        previous1RMMap.set(key, p.oneRepMax)
      }
    }

    // Session map: per client → completed/total counts
    interface SessionStats {
      completed: number
      total: number
    }
    const sessionMap = new Map<string, SessionStats>()
    for (const s of sessionAssignments) {
      const current = sessionMap.get(s.athleteId) || { completed: 0, total: 0 }
      current.total++
      if (s.status === 'COMPLETED') {
        current.completed++
      }
      sessionMap.set(s.athleteId, current)
    }

    // Body comp map: per client → latest + previous for deltas
    interface BodyCompEntry {
      weightKg: number | null
      bodyFatPercent: number | null
      muscleMassKg: number | null
      measurementDate: Date
    }
    const bodyCompMap = new Map<string, { latest: BodyCompEntry; previous: BodyCompEntry | null }>()
    const bodyCompClientName = new Map<string, string>()
    for (const b of bodyCompData) {
      bodyCompClientName.set(b.clientId, b.client.name)
      const existing = bodyCompMap.get(b.clientId)
      if (!existing) {
        bodyCompMap.set(b.clientId, {
          latest: { weightKg: b.weightKg, bodyFatPercent: b.bodyFatPercent, muscleMassKg: b.muscleMassKg, measurementDate: b.measurementDate },
          previous: null,
        })
      } else if (!existing.previous) {
        existing.previous = { weightKg: b.weightKg, bodyFatPercent: b.bodyFatPercent, muscleMassKg: b.muscleMassKg, measurementDate: b.measurementDate }
      }
    }

    // PR set: clients with PRs this week
    const clientPRSet = new Set<string>()
    for (const pr of recentPRs) {
      clientPRSet.add(pr.clientId)
    }

    // --- Build response ---

    // Previous 1RM for top exercise per client
    const clientTop1RMPrevious = new Map<string, number | null>()
    for (const p of progressionData) {
      const prog = progressionMap.get(p.clientId)
      if (prog && p.exercise.name === prog.topExerciseName && p.estimated1RM === prog.topEstimated1RM) {
        const prevKey = `${p.clientId}:${p.exerciseId}`
        clientTop1RMPrevious.set(p.clientId, previous1RMMap.get(prevKey) ?? null)
        break
      }
    }

    const gymClients = clients.map(client => {
      const prog = progressionMap.get(client.id)
      const sessions = sessionMap.get(client.id)
      const bodyComp = bodyCompMap.get(client.id)
      const lastActivityDate = activityMap.get(client.id)

      let daysSinceLastActivity: number | null = null
      if (lastActivityDate) {
        daysSinceLastActivity = Math.floor(
          (now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      let weightDelta: number | null = null
      let bodyFatDelta: number | null = null
      if (bodyComp?.latest && bodyComp.previous) {
        if (bodyComp.latest.weightKg !== null && bodyComp.previous.weightKg !== null) {
          weightDelta = Math.round((bodyComp.latest.weightKg - bodyComp.previous.weightKg) * 10) / 10
        }
        if (bodyComp.latest.bodyFatPercent !== null && bodyComp.previous.bodyFatPercent !== null) {
          bodyFatDelta = Math.round((bodyComp.latest.bodyFatPercent - bodyComp.previous.bodyFatPercent) * 10) / 10
        }
      }

      return {
        id: client.id,
        name: client.name,
        primarySport: client.sportProfile?.primarySport ?? null,
        currentPhase: prog?.currentPhase ?? null,
        worstProgressionStatus: prog?.worstProgressionStatus ?? null,
        plateauExercises: prog?.plateauExercises ?? 0,
        readyForIncreaseCount: prog?.readyForIncreaseCount ?? 0,
        topExerciseName: prog?.topExerciseName ?? null,
        topEstimated1RM: prog?.topEstimated1RM ?? null,
        previous1RM: clientTop1RMPrevious.get(client.id) ?? null,
        completedSessionsThisWeek: sessions?.completed ?? 0,
        totalSessionsThisWeek: sessions?.total ?? 0,
        latestWeight: bodyComp?.latest.weightKg ?? null,
        weightDelta,
        latestBodyFat: bodyComp?.latest.bodyFatPercent ?? null,
        bodyFatDelta,
        injuryCount: injuryMap.get(client.id) ?? 0,
        daysSinceLastActivity,
        hasPRThisWeek: clientPRSet.has(client.id),
      }
    })

    // Build recent PRs feed
    const prFeed = recentPRs.map(pr => {
      const prevKey = `${pr.clientId}:${pr.exerciseId}`
      return {
        id: pr.id,
        clientId: pr.clientId,
        clientName: pr.client.name,
        exerciseName: pr.exercise.name,
        oneRepMax: pr.oneRepMax,
        previousMax: previous1RMMap.get(prevKey) ?? null,
        date: pr.date.toISOString(),
        source: pr.source,
      }
    })

    // Build body comp summary
    const bodyCompSummary = Array.from(bodyCompMap.entries()).map(([clientId, data]) => {
      let wDelta: number | null = null
      let bfDelta: number | null = null
      if (data.previous) {
        if (data.latest.weightKg !== null && data.previous.weightKg !== null) {
          wDelta = Math.round((data.latest.weightKg - data.previous.weightKg) * 10) / 10
        }
        if (data.latest.bodyFatPercent !== null && data.previous.bodyFatPercent !== null) {
          bfDelta = Math.round((data.latest.bodyFatPercent - data.previous.bodyFatPercent) * 10) / 10
        }
      }
      return {
        clientId,
        clientName: bodyCompClientName.get(clientId) ?? '',
        latestDate: data.latest.measurementDate.toISOString(),
        weightKg: data.latest.weightKg,
        bodyFatPercent: data.latest.bodyFatPercent,
        muscleMassKg: data.latest.muscleMassKg,
        weightDelta: wDelta,
        bodyFatDelta: bfDelta,
      }
    })

    // Stats
    const activeAssignments = sessionAssignments.filter(
      s => s.status === 'PENDING' || s.status === 'SCHEDULED'
    ).length

    const prsThisWeek = recentPRs.length

    // Find most common exercise in PRs
    const exerciseCounts = new Map<string, number>()
    for (const pr of recentPRs) {
      const count = exerciseCounts.get(pr.exercise.name) ?? 0
      exerciseCounts.set(pr.exercise.name, count + 1)
    }
    let topPRExercise: string | null = null
    let maxCount = 0
    for (const [name, count] of exerciseCounts) {
      if (count > maxCount) {
        maxCount = count
        topPRExercise = name
      }
    }

    // Total plateau count across all clients
    let plateauCount = 0
    for (const [, prog] of progressionMap) {
      plateauCount += prog.plateauExercises
    }

    return NextResponse.json({
      clients: gymClients,
      recentPRs: prFeed,
      bodyCompSummary,
      stats: {
        activeAssignments,
        prsThisWeek,
        topPRExercise,
        plateauCount,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
