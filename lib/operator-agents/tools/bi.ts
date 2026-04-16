import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'
import { sendFounderEmail } from './_shared'

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function getMRRSnapshot(): Promise<OperatorToolResult> {
  try {
    const active = await prisma.athleteSubscription.findMany({
      where: {
        status: 'ACTIVE',
        tier: { not: 'FREE' },
      },
      select: { tier: true, billingCycle: true },
    })

    const byTier = active.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: {
        totalActiveSubscribers: active.length,
        byTier,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getChurnRate(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const [canceled, totalActive] = await Promise.all([
      prisma.athleteSubscription.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: since },
        },
      }),
      prisma.athleteSubscription.count({
        where: { status: 'ACTIVE', tier: { not: 'FREE' } },
      }),
    ])

    const rate = totalActive > 0 ? canceled / (totalActive + canceled) : 0

    return {
      success: true,
      data: {
        days,
        canceled,
        totalActive,
        churnRate: Math.round(rate * 10000) / 100, // as percentage with 2 decimals
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getNewSubscribersLast7d(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const subs = await prisma.athleteSubscription.findMany({
      where: {
        createdAt: { gte: since },
        tier: { not: 'FREE' },
      },
      select: { tier: true, status: true },
    })

    const byTier = subs.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { success: true, data: { total: subs.length, byTier } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveBIReport(content: string): Promise<OperatorToolResult> {
  try {
    const weekStart = getWeekStart()
    const title = `BI Report — Week of ${weekStart.toISOString().slice(0, 10)}`

    const report = await prisma.weeklyReport.upsert({
      where: { weekStart_reportType: { weekStart, reportType: 'BI_WEEKLY' } },
      update: { fullContent: content, title },
      create: {
        weekStart,
        reportType: 'BI_WEEKLY',
        title,
        fullContent: content,
      },
    })

    const emailResult = await sendFounderEmail(title, content)
    if (emailResult.sent) {
      await prisma.weeklyReport.update({
        where: { id: report.id },
        data: { emailedTo: emailResult.to, emailedAt: new Date() },
      })
    }

    return { success: true, data: { reportId: report.id, emailed: emailResult.sent } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// MARKETING CONTENT TOOLS
// ============================================================================
