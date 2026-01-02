/**
 * AI Configuration Endpoint
 *
 * GET /api/ai/config - Get AI configuration for current user
 *
 * Works for both coaches and athletes:
 * - Coaches: returns their own API keys and model settings
 * - Athletes: returns their coach's API keys and model settings
 */

import { NextResponse } from 'next/server'
import { getUserAIConfig } from '@/lib/ai/user-ai-config'

export async function GET() {
  try {
    const config = await getUserAIConfig()

    if (!config) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // Format response for FloatingAIChat compatibility
    const keys = [
      {
        provider: 'anthropic',
        configured: config.anthropicConfigured,
        valid: config.anthropicValid,
      },
      {
        provider: 'google',
        configured: config.googleConfigured,
        valid: config.googleValid,
      },
      {
        provider: 'openai',
        configured: config.openaiConfigured,
        valid: config.openaiValid,
      },
    ]

    return NextResponse.json({
      success: true,
      keys,
      hasApiKeys: config.hasApiKeys,
      defaultModel: config.defaultModel,
      isExplicitlySet: config.isExplicitlySet,
      coachId: config.coachId,
      userRole: config.userRole,
      isAthlete: config.isAthlete,
    })
  } catch (error) {
    console.error('Get AI config error:', error)

    return NextResponse.json(
      { error: 'Failed to get AI configuration', success: false },
      { status: 500 }
    )
  }
}
