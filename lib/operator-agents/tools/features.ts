import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

export async function getOpenFeatureRequests(): Promise<OperatorToolResult> {
  try {
    const requests = await prisma.featureRequest.findMany({
      where: {
        status: 'OPEN',
        agentImpactScore: null, // Not yet curated
      },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })
    return { success: true, data: { count: requests.length, requests } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAllFeatureRequests(): Promise<OperatorToolResult> {
  try {
    const requests = await prisma.featureRequest.findMany({
      where: { status: { in: ['OPEN', 'PLANNED'] } },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        upvotes: true,
      },
      take: 200,
    })
    return { success: true, data: { count: requests.length, requests } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function categorizeFeatureRequest(
  id: string,
  category: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: { category },
    })
    return { success: true, data: { id, category } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function scoreFeatureRequest(
  id: string,
  score: number,
  reasoning: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: {
        agentImpactScore: Math.max(0, Math.min(100, score)),
        agentSummary: reasoning.slice(0, 500),
      },
    })
    return { success: true, data: { id, score } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function markDuplicate(
  id: string,
  duplicateOfId: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: {
        agentDuplicateOf: duplicateOfId,
        status: 'DECLINED', // Duplicate declined, master stays open
      },
    })
    return { success: true, data: { id, duplicateOfId } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function summarizeFeatureRequest(
  id: string,
  summary: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: { agentSummary: summary.slice(0, 500) },
    })
    return { success: true, data: { id } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserTier(userId: string): Promise<OperatorToolResult> {
  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: {
        id: true,
        athleteSubscription: {
          select: { tier: true, status: true },
        },
      },
    })

    const tier = client?.athleteSubscription?.tier || 'FREE'
    const status = client?.athleteSubscription?.status || null
    return { success: true, data: { userId, tier, status } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// CHURN PREDICTOR TOOLS
// ============================================================================
