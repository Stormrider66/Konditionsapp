import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

export async function findOrphanedRecords(): Promise<OperatorToolResult> {
  try {
    // Check for common orphan patterns
    const [strengthAssignments, cardioAssignments, checkIns] = await Promise.all([
      // Strength assignments pointing to non-existent clients
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "StrengthSessionAssignment" s
        LEFT JOIN "Client" c ON c.id = s."athleteId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "CardioSessionAssignment" s
        LEFT JOIN "Client" c ON c.id = s."athleteId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "DailyCheckIn" d
        LEFT JOIN "Client" c ON c.id = d."clientId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
    ])

    const total = Number(strengthAssignments[0]?.count || 0) +
                  Number(cardioAssignments[0]?.count || 0) +
                  Number(checkIns[0]?.count || 0)

    return {
      success: true,
      data: {
        totalOrphaned: total,
        byTable: {
          strengthSessionAssignment: Number(strengthAssignments[0]?.count || 0),
          cardioSessionAssignment: Number(cardioAssignments[0]?.count || 0),
          dailyCheckIn: Number(checkIns[0]?.count || 0),
        },
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findDuplicateUsers(): Promise<OperatorToolResult> {
  try {
    const dupes = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
      SELECT email, COUNT(*)::bigint as count
      FROM "User"
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
      LIMIT 20
    `.catch(() => [])

    return {
      success: true,
      data: {
        duplicateCount: dupes.length,
        duplicates: dupes.map(d => ({ email: d.email, count: Number(d.count) })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findInvalidDates(): Promise<OperatorToolResult> {
  try {
    const now = new Date()
    const futureBirth = await prisma.client.count({
      where: { birthDate: { gt: now } },
    })
    const tooOld = await prisma.client.count({
      where: { birthDate: { lt: new Date('1900-01-01') } },
    })

    return {
      success: true,
      data: {
        futureBirthDates: futureBirth,
        impossiblyOldBirthDates: tooOld,
        totalIssues: futureBirth + tooOld,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findIncompleteProfiles(): Promise<OperatorToolResult> {
  try {
    const incomplete = await prisma.client.count({
      where: {
        OR: [
          { name: '' },
          { gender: undefined as never },
        ],
      },
    })

    const totalClients = await prisma.client.count()
    const percentIncomplete = totalClients > 0 ? (incomplete / totalClients) * 100 : 0

    return {
      success: true,
      data: {
        incompleteProfiles: incomplete,
        totalClients,
        percentIncomplete: Math.round(percentIncomplete * 10) / 10,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findStaleData(): Promise<OperatorToolResult> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [staleClients, totalClients] = await Promise.all([
      prisma.client.count({ where: { updatedAt: { lt: ninetyDaysAgo } } }),
      prisma.client.count(),
    ])

    return {
      success: true,
      data: {
        staleClients,
        totalClients,
        percentStale: totalClients > 0 ? Math.round((staleClients / totalClients) * 1000) / 10 : 0,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function calculateDataHealthScore(): Promise<OperatorToolResult> {
  try {
    // Start at 100 and deduct for each issue
    let score = 100
    const issues: string[] = []

    const orphans = await findOrphanedRecords()
    if (orphans.success && orphans.data) {
      const total = (orphans.data as { totalOrphaned: number }).totalOrphaned
      if (total > 10) { score -= 20; issues.push(`${total} orphaned records`) }
      else if (total > 0) { score -= 5; issues.push(`${total} orphaned records`) }
    }

    const dupes = await findDuplicateUsers()
    if (dupes.success && dupes.data) {
      const count = (dupes.data as { duplicateCount: number }).duplicateCount
      if (count > 0) { score -= 25; issues.push(`${count} duplicate user emails`) }
    }

    const invalidDates = await findInvalidDates()
    if (invalidDates.success && invalidDates.data) {
      const total = (invalidDates.data as { totalIssues: number }).totalIssues
      if (total > 5) { score -= 10; issues.push(`${total} invalid dates`) }
      else if (total > 0) { score -= 3; issues.push(`${total} invalid dates`) }
    }

    const stale = await findStaleData()
    if (stale.success && stale.data) {
      const pct = (stale.data as { percentStale: number }).percentStale
      if (pct > 30) { score -= 10; issues.push(`${pct}% of clients are stale`) }
    }

    return {
      success: true,
      data: {
        score: Math.max(0, score),
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
        issues,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// COMPLIANCE & SECURITY TOOLS
// ============================================================================

