/**
 * Athlete AI Configuration
 *
 * GET /api/athlete/ai-config - Get coach's AI config for athlete use
 *
 * Athletes use their coach's API keys and default model.
 * This endpoint returns the configuration without exposing actual keys.
 */

import { NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAthlete()

    // Get athlete's account and linked client -> coach
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          select: {
            id: true,
            userId: true, // This is the coach's user ID
          },
        },
      },
    })

    if (!athleteAccount?.client?.userId) {
      return NextResponse.json(
        { error: 'Athlete account not properly linked to coach' },
        { status: 400 }
      )
    }

    const coachId = athleteAccount.client.userId

    // Fetch coach's API keys and default model in parallel
    const [apiKeys, defaultModel] = await Promise.all([
      prisma.userApiKey.findUnique({
        where: { userId: coachId },
        select: {
          anthropicKeyValid: true,
          googleKeyValid: true,
          openaiKeyValid: true,
        },
      }),
      prisma.aIModel.findFirst({
        where: {
          isDefault: true,
          isActive: true,
        },
        select: {
          id: true,
          provider: true,
          modelId: true,
          displayName: true,
        },
      }),
    ])

    // Check if coach has any valid AI keys
    const hasAIAccess =
      apiKeys?.anthropicKeyValid ||
      apiKeys?.googleKeyValid ||
      apiKeys?.openaiKeyValid ||
      false

    // Determine which provider to use based on available keys
    let provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI' = 'GOOGLE'
    let model = 'gemini-2.5-pro-preview-06-05'
    let displayName = 'Gemini 2.5 Pro'

    if (defaultModel) {
      // Use coach's default model if available
      provider = defaultModel.provider as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
      model = defaultModel.modelId
      displayName = defaultModel.displayName
    } else if (apiKeys) {
      // Fallback to first available provider
      if (apiKeys.googleKeyValid) {
        provider = 'GOOGLE'
        model = 'gemini-2.5-pro-preview-06-05'
        displayName = 'Gemini 2.5 Pro'
      } else if (apiKeys.anthropicKeyValid) {
        provider = 'ANTHROPIC'
        model = 'claude-sonnet-4-5-20250929'
        displayName = 'Claude Sonnet 4.5'
      } else if (apiKeys.openaiKeyValid) {
        provider = 'OPENAI'
        model = 'gpt-4o'
        displayName = 'GPT-4o'
      }
    }

    return NextResponse.json({
      success: true,
      hasAIAccess,
      model,
      provider,
      displayName,
      clientId: athleteAccount.client.id,
    })
  } catch (error) {
    console.error('Get athlete AI config error:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get AI configuration' },
      { status: 500 }
    )
  }
}
